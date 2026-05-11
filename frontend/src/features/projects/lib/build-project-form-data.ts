import type { ProjectEditFormValues } from "../model/project-edit-schema";

import { isTerminalProjectStatus } from "./project-status-options";

export function buildCreateProjectFormData(
  values: {
    title: string;
    description: string;
    goals: string;
    requiredSkillIds: string[];
  },
  newFiles: File[]
): FormData {
  const form = new FormData();
  form.append("title", values.title.trim());
  form.append("description", values.description.trim());
  form.append("goals", values.goals.trim());
  form.append("requiredSkillIds", JSON.stringify(values.requiredSkillIds));
  newFiles.forEach((file) => {
    form.append("documents", file);
  });

  return form;
}

export function buildUpdateProjectFormData(
  values: ProjectEditFormValues,
  options: {
    newFiles: File[];
    removeAttachmentIds: string[];
  }
): FormData {
  const form = new FormData();
  form.append("title", values.title.trim());
  form.append("description", values.description.trim());
  form.append("goals", values.goals.trim());
  form.append("status", values.status);

  if (!isTerminalProjectStatus(values.status)) {
    form.append("acceptingApplications", String(values.acceptingApplications));
  }

  form.append("requiredSkillIds", JSON.stringify(values.requiredSkillIds));

  if (options.removeAttachmentIds.length > 0) {
    form.append(
      "removeAttachmentIds",
      JSON.stringify(options.removeAttachmentIds)
    );
  }

  options.newFiles.forEach((file) => {
    form.append("documents", file);
  });

  return form;
}
