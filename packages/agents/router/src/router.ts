import { logger as ethersLogger, logger, Wallet } from "ethers";
import {
  createMethodContext,
  createRequestContext,
  getChainData,
  jsonifyError,
  Logger,
  RequestContext,
  ChainData,
} from "@connext/nxtp-utils";
import { SubgraphReader } from "@connext/nxtp-adapters-subgraph";
import { StoreManager } from "@connext/nxtp-adapters-cache";
import { Web3Signer } from "@connext/nxtp-adapters-web3signer";
import { getContractInterfaces, TransactionService, contractDeployments } from "@connext/nxtp-txservice";
import axios from "axios";
import { BridgeContext } from "@nomad-xyz/sdk-bridge";

import { getConfig, NxtpRouterConfig } from "./config";
import { bindMetrics, bindPrices, bindSubgraph, bindServer, bindCache } from "./bindings";
import { AppContext } from "./lib/entities";
import { getHelpers } from "./lib/helpers";

// AppContext instance used for interacting with adapters, config, etc.
const context: AppContext = {} as any;
export const getContext = () => context;

export const makeRouter = async (_configOverride?: NxtpRouterConfig) => {
  const requestContext = createRequestContext("Router Init");
  const methodContext = createMethodContext(makeRouter.name);

  try {
    context.adapters = {} as any;

    /// MARK - Config.
    // Get ChainData and parse out configuration.
    context.chainData = await getChainData();
    context.config = _configOverride ?? (await getConfig(context.chainData, contractDeployments));

    /// MARK - Signer
    context.adapters.wallet = context.config.mnemonic
      ? Wallet.fromMnemonic(context.config.mnemonic)
      : new Web3Signer(context.config.web3SignerUrl!);

    context.routerAddress = await context.adapters.wallet.getAddress();

    /// MARK - Logger
    context.logger = new Logger({
      level: context.config.logLevel,
      name: context.routerAddress,
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() };
        },
      },
    });
    context.logger.info("Generated config.", requestContext, methodContext, {
      config: { ...context.config, mnemonic: context.config.mnemonic ? "*****" : "N/A" },
    });

    /// MARK - BridgeContext
    context.bridgeContext = setupBridgeContext(requestContext);

    /// MARK - Adapters
    context.adapters.cache = await setupCache(requestContext);
    context.adapters.subgraph = await setupSubgraphReader(requestContext);
    context.adapters.txservice = new TransactionService(
      context.logger.child({ module: "TransactionService", level: context.config.logLevel }),
      context.config.chains,
      context.adapters.wallet,
    );
    context.adapters.contracts = getContractInterfaces();

    /// MARK - Validation for auctionRoundDepth

    /// MARK - Cold Start Housekeeping
    try {
      const res = await axios.get(`${context.config.sequencerUrl}/ping`);
      context.logger.info("Ping response received from sequencer", requestContext, methodContext, {
        response: res.data,
      });
    } catch (e: unknown) {
      context.logger.error(
        "Ping error, could not reach sequencer. Exiting!",
        requestContext,
        methodContext,
        jsonifyError(e as Error),
      );
      process.exit(1);
    }
    // TODO: Cold start housekeeping cont'd.
    // - read subgraph to make sure router is approved
    // - read contract or subgraph for current liquidity in each asset, cache it
    // - read subgraph to make sure each asset is (still) approved
    // - bring cache up to speed
    // - make sure a relayer is configured for supported chains.

    /// MARK - Bindings
    // TODO: New diagnostic mode / cleanup mode?
    if (context.config.mode.priceCaching) {
      await bindPrices();
    } else {
      context.logger.warn("Running router without price caching.", requestContext, methodContext);
    }
    await bindServer();
    await bindMetrics();
    await bindSubgraph();
    await bindCache();

    context.logger.info("Bindings initialized.", requestContext, methodContext);
    context.logger.info("Router boot complete!", requestContext, methodContext, {
      port: context.config.server.port,
      chains: [...Object.keys(context.config.chains)],
    });
    ethersLogger.info(
      `

        _|_|_|     _|_|     _|      _|   _|      _|   _|_|_|_|   _|      _|   _|_|_|_|_|
      _|         _|    _|   _|_|    _|   _|_|    _|   _|           _|  _|         _|
      _|         _|    _|   _|  _|  _|   _|  _|  _|   _|_|_|         _|           _|
      _|         _|    _|   _|    _|_|   _|    _|_|   _|           _|  _|         _|
        _|_|_|     _|_|     _|      _|   _|      _|   _|_|_|_|   _|      _|       _|

      `,
    );
  } catch (e: unknown) {
    console.error("Error starting router. Sad! :(", e);
    process.exit();
  }
};

export const setupCache = async (requestContext: RequestContext): Promise<StoreManager> => {
  const {
    config: { redis },
    logger,
  } = context;

  const methodContext = createMethodContext("setupCache");
  logger.info("Cache instance setup in progress...", requestContext, methodContext, {});
  const cacheInstance = StoreManager.getInstance({
    redis: { host: redis.host, port: redis.port, instance: undefined },
    mock: !redis.host || !redis.port,
    logger: logger.child({ module: "StoreManager" }),
  });

  logger.info("Cache instance setup is done!", requestContext, methodContext, {
    host: redis.host,
    port: redis.port,
  });
  return cacheInstance;
};

export const setupSubgraphReader = async (requestContext: RequestContext): Promise<SubgraphReader> => {
  const { logger, chainData, config } = context;
  const {
    auctions: { getMinimumBidsCountForRound },
  } = getHelpers();
  const methodContext = createMethodContext(setupSubgraphReader.name);

  const allowedDomains = [...Object.keys(config.chains)];
  const allowedChainData: Map<string, ChainData> = new Map();
  for (const allowedDomain of allowedDomains) {
    if (chainData.has(allowedDomain)) {
      allowedChainData.set(allowedDomain, chainData.get(allowedDomain)!);
    }
  }
  logger.info("Subgraph reader setup in progress...", requestContext, methodContext, { allowedChainData });
  const subgraphReader = await SubgraphReader.create(allowedChainData, config.environment, config.subgraphPrefix);

  // Pull support for domains that don't have a subgraph.
  const supported: Record<string, boolean> = subgraphReader.supported;
  for (const domain of Object.keys(supported)) {
    // If the domain is set to false, it indicates the SubgraphReader did not find active subgraphs for that domain.
    if (!supported[domain]) {
      delete context.config.chains[domain];
    }
  }

  logger.info("Subgraph reader setup is done!", requestContext, methodContext, {});

  logger.info("Validating the auction round depth for each domain...");
  const maxRoutersPerTransfer = await subgraphReader.getMaxRoutersPerTransfer(Object.keys(supported));
  for (const domain of maxRoutersPerTransfer.keys()) {
    const configuredMaxRouters = getMinimumBidsCountForRound(config.auctionRoundDepth);
    if (maxRoutersPerTransfer.has(domain) && configuredMaxRouters > maxRoutersPerTransfer.get(domain)!) {
      logger.info("Validation error, Invalid auctionRoundDepth configured!", requestContext, methodContext, {
        domain,
        auctionRoundDepth: config.auctionRoundDepth,
        configured: configuredMaxRouters,
        onchain: maxRoutersPerTransfer.get(domain),
      });
      process.exit(1);
    }
  }

  return subgraphReader;
};

export const setupBridgeContext = (requestContext: RequestContext): BridgeContext => {
  const { config } = context;
  const methodContext = createMethodContext(setupBridgeContext.name);
  logger.info("BridgeContext setup in progress...", requestContext, methodContext, {});
  const bridgeContext = new BridgeContext(config.nomadEnvironment);

  const allowedDomains = [...Object.keys(config.chains)];
  for (const allowedDomain of allowedDomains) {
    const chainData = config.chains[allowedDomain];
    chainData.providers.map((provider) => {
      bridgeContext.registerRpcProvider(Number(allowedDomain), provider);
    });
  }
  logger.info("BridgeContext setup done!", requestContext, methodContext, {});
  return bridgeContext;
};
