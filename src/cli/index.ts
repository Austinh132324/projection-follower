import { config } from '../config.js';
import type { Book } from '../normalize/bet.js';
import { getScraper, SCRAPERS } from '../books/registry.js';
import { interactiveLogin, hasSession } from '../session/manager.js';
import { syncAll } from '../sync/orchestrator.js';

/**
 * The command-line entry point. `login` handles the one-time interactive sign-in
 * per book; `sync` runs the orchestrator — this is what a cron job calls.
 *
 *   npm run login -- draftkings     # first-time / re-auth
 *   npm run sync                    # sync all configured books
 *   npm run sync -- draftkings      # sync one book
 *   npm run cli -- status           # show session + last-sync state per book
 */

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case 'login':
      await cmdLogin(rest[0]);
      break;
    case 'sync':
      await cmdSync(rest);
      break;
    case 'status':
      cmdStatus();
      break;
    default:
      printUsage();
      process.exitCode = command ? 1 : 0;
  }
}

async function cmdLogin(bookArg?: string): Promise<void> {
  if (!bookArg) {
    console.error('Usage: npm run login -- <book>');
    console.error(`Books: ${Object.keys(SCRAPERS).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const book = bookArg.toLowerCase() as Book;
  const scraper = getScraper(book);
  await interactiveLogin(book, scraper.loginUrl, (ctx) => scraper.isLoggedIn(ctx));
}

async function cmdSync(args: string[]): Promise<void> {
  const books = args.length ? (args.map((a) => a.toLowerCase()) as Book[]) : undefined;
  const result = await syncAll({ books });

  for (const r of result.books) {
    if (r.ok) {
      console.log(
        `✓ ${r.book}: ${r.fetched} fetched (${r.inserted} new, ${r.updated} updated)`,
      );
    } else if (r.needsReauth) {
      console.error(`! ${r.book}: session expired — run \`npm run login -- ${r.book}\``);
    } else {
      console.error(`✗ ${r.book}: ${r.error}`);
    }
  }

  const anyFailure = result.books.some((r) => !r.ok);
  if (anyFailure) process.exitCode = 1;
}

function cmdStatus(): void {
  console.log(`data dir: ${config.dataDir}`);
  for (const book of Object.keys(SCRAPERS) as Book[]) {
    console.log(`  ${book}: session=${hasSession(book) ? 'yes' : 'no'}`);
  }
}

function printUsage(): void {
  console.log(`projection-follower

Commands:
  login <book>     Interactive first-time login; saves the session.
  sync [books...]  Fetch + normalize + store. Defaults to configured books.
  status           Show session state per book.

Configured books: ${config.books.join(', ') || '(none)'}
`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
