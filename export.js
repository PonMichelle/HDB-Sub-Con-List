const { execSync } = require('child_process');
const fs = require('fs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const outPath = '/tmp/export_out.xlsx';
    const payload = JSON.parse(event.body);
    payload.outPath = outPath;

    // Write payload to stdin of python script
    fs.writeFileSync('/tmp/export_in.json', JSON.stringify(payload));
    execSync(
      `python3 ${__dirname}/export.py < /tmp/export_in.json`,
      { timeout: 30000 }
    );

    const xlsxBuf = fs.readFileSync(outPath);
    const projName = (payload.projTitle || 'HDB').replace(/[^a-z0-9]/gi, '_');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${projName}_QuotationList.xlsx"`,
      },
      body: xlsxBuf.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Export failed: ' + err.message };
  }
};
