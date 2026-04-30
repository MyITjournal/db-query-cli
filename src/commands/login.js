import ora from 'ora';
import chalk from 'chalk';
import { login } from '../auth.js';

export async function loginCommand() {
  const spinner = ora('Waiting for GitHub login...').start();
  try {
    spinner.stop();
    const username = await login();
    console.log(chalk.green(`\n✔ Logged in as ${chalk.bold(username)}`));
  } catch (err) {
    spinner.fail(chalk.red(`Login failed: ${err.message}`));
    process.exit(1);
  }
}
