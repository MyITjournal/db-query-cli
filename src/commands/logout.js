import ora from 'ora';
import chalk from 'chalk';
import { logout } from '../auth.js';

export async function logoutCommand() {
  const spinner = ora('Logging out...').start();
  try {
    const wasLoggedIn = await logout();
    if (wasLoggedIn) {
      spinner.succeed(chalk.green('Logged out successfully.'));
    } else {
      spinner.info(chalk.yellow('You were not logged in.'));
    }
  } catch (err) {
    spinner.fail(chalk.red(`Logout failed: ${err.message}`));
    process.exit(1);
  }
}
