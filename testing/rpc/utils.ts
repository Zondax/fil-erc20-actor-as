import log4js from "log4js";

export const logger = log4js.getLogger();
logger.level = process.env["LOG_LEVEL"] || "TRACE";

export async function getFee(filRPC, tx) {
  try {
    const fees = await filRPC.getGasEstimation({ ...tx });
    logger.trace(`Fees: ${JSON.stringify(fees)}`);

    expect(fees.error).not.toBeDefined();
    if (fees.error) return;

    expect(fees.result).toBeDefined();
    expect(fees.result.GasFeeCap).toBeDefined();
    expect(fees.result.GasPremium).toBeDefined();
    expect(fees.result.GasLimit).toBeDefined();

    const { GasFeeCap, GasPremium, GasLimit } = fees.result;
    tx = {
      ...tx,
      GasFeeCap,
      GasPremium,
      GasLimit,
    };

    return tx;
  } catch (err) {
    logger.error(`Error fetching fees: ${JSON.stringify(err)}`);
  }
}
