import {
  CloudWatchLogsClient,
  DescribeSubscriptionFiltersCommand,
  SubscriptionFilter
} from "@aws-sdk/client-cloudwatch-logs";

export default class LogWrap {
  private cwlClient: CloudWatchLogsClient;

  constructor (region: string) {
    this.cwlClient = new CloudWatchLogsClient({ region });
  }

  async getSubscriptionFilter (logGroupName: string, destinationArn: string): Promise<SubscriptionFilter | null> {
    const { subscriptionFilters } = await this.cwlClient.send(new DescribeSubscriptionFiltersCommand({
      logGroupName
    }));
    const filter = subscriptionFilters.find((s) => s.destinationArn === destinationArn);
    if (filter === undefined) {
      return null;
    }
    return filter;
  }
}
