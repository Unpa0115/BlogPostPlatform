declare module 'playwright-stealth' {
  import { Page } from 'playwright';
  
  export function stealth(page: Page): Promise<void>;
} 