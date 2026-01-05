/**
 * SEO関連コンポーネントのエクスポート
 */
export {
  WebsiteStructuredData,
  BreadcrumbStructuredData,
  EventStructuredData,
  FAQStructuredData,
  LocalBusinessStructuredData,
} from './structured-data';

export {
  Breadcrumb,
  RPGBreadcrumb,
  type BreadcrumbItem,
} from './breadcrumb';

// 既存のコンポーネント
export { default as AreaEventList } from './area-event-list';
export { default as EventStructuredDataComponent } from './event-structured-data';
export { default as RelatedEvents } from './related-events';

