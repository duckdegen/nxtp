import { ajv, createLoggingContext, ExecuteArgs, ExecuteArgsSchema, RequestContext } from "@connext/nxtp-utils";

import { getOperations } from "../operations";
import { getContext } from "../../lighthouse";

// fee percentage paid to relayer. need to be updated later
export const RELAYER_FEE_PERCENTAGE = "1"; //  1%

/**
 * Router creates a new bid and sends it to auctioneer.
 *
 * @param args - The crosschain xcall params.
 */
export const execute = async (
  args: ExecuteArgs,
  transferId: string,
  _requestContext: RequestContext,
): Promise<void> => {
  const { requestContext, methodContext } = createLoggingContext(execute.name);

  const {
    logger,
    adapters: { contracts },
  } = getContext();
  const { sendToRelayer } = getOperations();

  logger.info("Method start", requestContext, methodContext, { args });

  // Validate input schema
  const validate = ajv.compile(ExecuteArgsSchema);
  const valid = validate(args);
  if (!valid) {
    throw new Error(validate.errors?.map((err: unknown) => JSON.stringify(err, null, 2)).join(","));
  }

  const encodedData = contracts.connext.encodeFunctionData("execute", [args]);
  await sendToRelayer(args, encodedData, transferId, requestContext);
};
