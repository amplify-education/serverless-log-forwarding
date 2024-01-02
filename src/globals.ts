import { ServerlessInstance, ServerlessUtils } from "./types";

export default class Globals {
  public static pluginName = "Serverless Log Forwarding";

  public static serverless: ServerlessInstance;
  public static v3Utils?: ServerlessUtils;
}
