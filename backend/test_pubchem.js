const axios = require('axios');

async function getGHSFromCAS(cas) {
    try {
        console.log(`Looking up CID for CAS: ${cas}`);
        // Step 1: Get CID
        const cidUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${cas}/cids/JSON`;
        const cidRes = await axios.get(cidUrl);
        const cid = cidRes.data.IdentifierList.CID[0];
        console.log(`Found CID: ${cid}`);

        // Step 2: Get Safety Data
        console.log(`Fetching Safety Data for CID: ${cid}`);
        const safetyUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=Safety+and+Hazards`;
        const safetyRes = await axios.get(safetyUrl);

        // Step 3: Extract GHS Classification
        const sections = safetyRes.data.Record.Section;
        const safetySection = sections.find(s => s.TOCHeading === 'Safety and Hazards');
        if (!safetySection) throw new Error('No Safety Section found');

        const hazardsSection = safetySection.Section.find(s => s.TOCHeading === 'Hazards Identification');
        if (!hazardsSection) throw new Error('No Hazards Identification found');

        const ghsSection = hazardsSection.Section.find(s => s.TOCHeading === 'GHS Classification');
        if (!ghsSection) throw new Error('No GHS Classification found');

        const information = ghsSection.Information;
        const hazardStatements = information.find(i => i.Name === 'GHS Hazard Statements');

        if (hazardStatements) {
            console.log('--- GHS Hazard Statements ---');
            hazardStatements.Value.StringWithMarkup.forEach(item => {
                console.log(item.String);
            });
        } else {
            console.log('No GHS Hazard Statements found');
            // Fallback: Try to find "Signal" or other relevant info
            const signal = information.find(i => i.Name === 'Signal');
            if (signal) {
                console.log('Signal:', signal.Value.StringWithMarkup[0].String);
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// Test with Dicamba
getGHSFromCAS('1918-00-9');
