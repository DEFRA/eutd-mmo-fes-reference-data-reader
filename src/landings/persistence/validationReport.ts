import { IDefraValidationReport, DefraValidationReportData } from "../types/defraValidation";

export const insertValidationReport = async (report: IDefraValidationReport) : Promise<void> => {
  await new DefraValidationReportData(report).save();
}