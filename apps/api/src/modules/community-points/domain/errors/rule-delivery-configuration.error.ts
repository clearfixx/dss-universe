export class PointRuleDeliveryConfigurationError extends Error {
  constructor() {
    super('Automatic delivery does not support this rule configuration.');
    this.name = 'PointRuleDeliveryConfigurationError';
  }
}
