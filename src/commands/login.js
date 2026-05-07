import chalk from "chalk";
import { login } from "../auth.js";

export async function loginCommand() {
  try {
    const username = await login();
    console.log(chalk.green(`\nLogged in as ${chalk.bold(`@${username}`)}`));
  } catch (err) {
    console.error(chalk.red(`\nLogin failed: ${err.message}`));
    process.exit(1);
  }
}
