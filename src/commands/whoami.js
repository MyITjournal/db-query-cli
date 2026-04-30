import ora from "ora";
import chalk from "chalk";
import Table from "cli-table3";
import { getMe } from "../api.js";

export async function whoamiCommand() {
  const spinner = ora("Fetching user info...").start();
  try {
    const user = await getMe();
    spinner.stop();

    const table = new Table();
    table.push(
      ["Username", chalk.cyan(user.username)],
      ["Email", user.email ?? chalk.dim("n/a")],
      [
        "Role",
        user.role === "admin" ? chalk.yellow("admin") : chalk.green("analyst"),
      ],
      ["ID", chalk.dim(user.id)],
    );
    console.log(table.toString());
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
