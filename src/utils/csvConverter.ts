const { Parser } = require('json2csv');

export class CsvConverter {
    generateCatchCertificateReport(report) {
        const parser = new Parser();
        
        return parser.parse(report);
    }
}
