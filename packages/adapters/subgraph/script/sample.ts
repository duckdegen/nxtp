import { ChainData, getChainData, OriginTransfer, SubgraphQueryMetaParams } from "@connext/nxtp-utils";
import { gql } from "graphql-request";

import { SubgraphReader } from "../src/reader";

export const test = async () => {
  // TODO. Creates live tests for SubgraphReader functions.
  // This needs to be removed after getting integrated into other packages.
  // rinkeby => (domain: 1111, network: rinkeby)
  // kovan => (domain: 2221, network: kovan)
  // goerli => (domain: 3331, network: goerli)
  const allowedDomains = ["1111", "2221", "3331"];

  const chainData = await getChainData();
  const allowedChainData: Map<string, ChainData> = new Map();
  for (const allowedDomain of allowedDomains) {
    if (chainData.has(allowedDomain)) {
      allowedChainData.set(allowedDomain, chainData.get(allowedDomain)!);
    }
  }
  const subgraphReader = await SubgraphReader.create(allowedChainData!, "production");

  // test -> query()
  const query = gql`
    query GetRouter {
      kovan_routers(first: 5) {
        id
      }
      rinkeby_routers(first: 5) {
        id
      }
    }
  `;
  const routersResponse = await subgraphReader.query(query);
  console.log([...routersResponse.values()][0][0]);
  console.log([...routersResponse.values()][1][0]);

  // getLastesBlockNumber(domains)
  const lastesBlockNumbers = await subgraphReader.getLatestBlockNumber(allowedDomains);
  console.log("> lastesBlockNumber: ");
  console.log(lastesBlockNumbers);

  // getAssetBalance(domain, router, local)
  console.log(
    (
      await subgraphReader.getAssetBalance(
        "2221",
        "0x71dd9fc6fe5427f0c7cd7d42bc89effe11c6d4b7",
        "0xb5aabb55385bfbe31d627e2a717a7b189dda4f8f",
      )
    ).toString(),
  );

  // getAssetBalances(domain, router)
  console.log(await subgraphReader.getAssetBalances("2221", "0x71dd9fc6fe5427f0c7cd7d42bc89effe11c6d4b7"));

  // isRouterApproved
  console.log(await subgraphReader.isRouterApproved("2221", "0x71dd9fc6fe5427f0c7cd7d42bc89effe11c6d4b7"));

  // getAssetByLocal(domain, local)
  console.log(await subgraphReader.getAssetByLocal("2221", "0xb5aabb55385bfbe31d627e2a717a7b189dda4f8f"));

  // getAssetByCanoncialId(domain, canonicalId)
  console.log(
    await subgraphReader.getAssetByCanonicalId(
      "1111",
      "0x000000000000000000000000b5aabb55385bfbe31d627e2a717a7b189dda4f8f",
    ),
  );

  // getOriginTransferById(domain, transferId)
  console.log(
    await subgraphReader.getOriginTransferById(
      "2221",
      "0x75730b13a1ef662696aa50def454adfea8eb6a1d89e8bf90f2001885c7d7476e",
    ),
  );

  // getXCalls(agents)
  console.log(`XCalling...`);
  const agents: Map<string, SubgraphQueryMetaParams> = new Map();
  agents.set("1111", { maxBlockNumber: 99999999, latestNonce: 0, page: 1, perPage: 5 });
  agents.set("2221", { maxBlockNumber: 99999999, latestNonce: 0, page: 1, perPage: 2 });
  console.log(await subgraphReader.getXCalls(agents));
  console.log(`XCalling done!`);

  // getOriginTransfers(agents)
  console.log(`Get origin transfers on the domains...`);
  console.log(await subgraphReader.getOriginTransfers(agents));
  console.log(`getOriginTransfers done!!!`);

  // getDestinationTransfers(transfers)
  const transfers: OriginTransfer[] = [
    {
      originDomain: "1111",
      destinationDomain: "2221",
      nonce: 13,
      xparams: {
        to: "0x5a9e792143bf2708b4765c144451dca54f559a19",
        callData: "0x",
        forceSlow: false,
        receiveSlow: false,
      },
      transferId: "0xfad20d0b772e21887c75c59b8f2f8d3c235e7815203cc5980e54723004f9d572",
      origin: undefined,
      destination: undefined,
    },
    {
      originDomain: "1111",
      destinationDomain: "2221",
      xparams: {
        to: "0x5a9e792143bf2708b4765c144451dca54f559a19",
        callData: "0x",
        forceSlow: false,
        receiveSlow: false,
      },
      transferId: "0xf3ff58c78a0068093ac06b6c00ff7535e8116b68da4976dc6c3f7029ed319469",
      nonce: 13,
      origin: undefined,
      destination: undefined,
    },
    {
      originDomain: "2221",
      destinationDomain: "1111",
      xparams: {
        to: "0x5a9e792143bf2708b4765c144451dca54f559a19",
        callData: "0x",
        forceSlow: false,
        receiveSlow: false,
      },
      transferId: "0x41d57cb2528103379f476ff8797f468610a046935b38c9b15b2647d639985473",

      nonce: 13,
      origin: undefined,
      destination: undefined,
    },
    {
      originDomain: "1111",
      destinationDomain: "2221",
      xparams: {
        to: "0x5a9e792143bf2708b4765c144451dca54f559a19",
        callData: "0x",
        forceSlow: false,
        receiveSlow: false,
      },
      transferId: "0xb438cae3d126e1d2a5e02b34829130b49279230e14c03ab69795275f625bb0fd",

      nonce: 13,
      origin: undefined,
      destination: undefined,
    },
  ];
  console.log(await subgraphReader.getDestinationTransfers(transfers));
};

test();
