// Icon prefix types - common Font Awesome prefixes
export type IconPrefix = 'fas' | 'far' | 'fal' | 'fat' | 'fad' | 'fab' | 'fak' | 'fass' | string;

// Icon name type - since we use dynamic icon names, this is a string
export type IconName = string;

// Icon tuple type used throughout the app
export type IconTuple = [IconPrefix, IconName];
