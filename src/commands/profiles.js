import ora from "ora";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  listProfiles,
  getProfile,
  searchProfiles,
  createProfile,
  exportProfiles,
} from "../api.js";

export async function profilesListCommand(opts) {
  const spinner = ora("Fetching profiles...").start();
  try {
    const filters = {
      gender: opts.gender,
      age_group: opts.ageGroup,
      country_id: opts.country,
      min_age: opts.minAge,
      max_age: opts.maxAge,
      sort_by: opts.sortBy,
      order: opts.order,
      page: opts.page,
      limit: opts.limit,
    };

    const data = await listProfiles(filters);
    spinner.stop();

    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    spinner.fail(err.message);
    process.exit(1);
  }
}

export async function profilesGetCommand(id) {
  const spinner = ora(`Fetching profile ${id}...`).start();
  try {
    const p = await getProfile(id);
    spinner.stop();
    console.log(JSON.stringify(p, null, 2));
  } catch (err) {
    spinner.fail(err.message);
    process.exit(1);
  }
}

export async function profilesSearchCommand(query, opts) {
  const spinner = ora(`Searching for "${query}"...`).start();
  try {
    const data = await searchProfiles(query, {
      page: opts.page,
      limit: opts.limit,
    });
    spinner.stop();

    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    spinner.fail(err.message);
    process.exit(1);
  }
}

export async function profilesCreateCommand(opts) {
  if (!opts.name) {
    console.error("Error: --name is required");
    process.exit(1);
  }

  const spinner = ora(`Creating profile for "${opts.name}"...`).start();
  try {
    const p = await createProfile(opts.name);
    spinner.stop();
    console.log(JSON.stringify(p, null, 2));
  } catch (err) {
    spinner.fail(err.message);
    process.exit(1);
  }
}

export async function profilesExportCommand(opts) {
  if (opts.format !== "csv") {
    console.error("Error: only --format csv is supported");
    process.exit(1);
  }

  const spinner = ora("Exporting profiles...").start();
  try {
    const filters = {
      gender: opts.gender,
      country_id: opts.country,
    };

    const { filename, csvText } = await exportProfiles(filters);
    const outputPath = resolve(process.cwd(), filename);
    await writeFile(outputPath, csvText, "utf8");
    spinner.succeed(`Exported to ${outputPath}`);
  } catch (err) {
    spinner.fail(err.message);
    process.exit(1);
  }
}
