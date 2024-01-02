import Globals from "./globals";

export default class Logging {
  public static cliLog (prefix: string, message: string): void {
    Globals.serverless.cli.log(`${prefix} ${message}`, Globals.pluginName);
  }

  /**
     * Logs error message
     */
  public static logError (message: string): void {
    if (Globals.v3Utils) {
      Globals.v3Utils.log.error(message);
    } else {
      Logging.cliLog("[Error]", message);
    }
  }

  /**
     * Logs info message
     */
  public static logInfo (message: string): void {
    if (Globals.v3Utils) {
      Globals.v3Utils.log.verbose(message);
    } else {
      Logging.cliLog("[Info]", message);
    }
  }

  /**
     * Logs warning message
     */
  public static logWarning (message: string): void {
    if (Globals.v3Utils) {
      Globals.v3Utils.log.warning(message);
    } else {
      Logging.cliLog("[WARNING]", message);
    }
  }
}
