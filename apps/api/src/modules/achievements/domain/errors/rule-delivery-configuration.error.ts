export class AchievementRuleDeliveryConfigurationError extends Error {
  constructor() {
    super('Automatic delivery does not support this rule configuration.');
    this.name = 'AchievementRuleDeliveryConfigurationError';
  }
}
