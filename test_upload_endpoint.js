
const fs = require('fs');
const path = require('path');

async function testUpload() {
  const filePath = path.join(__dirname, 'dummy_resume.pdf');
  const fileBuffer = fs.readFileSync(filePath);
  
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  formData.append('file', blob, 'dummy_resume.pdf');
  formData.append('roleId', 'role_6tgvloa76');

  console.log('Starting upload test to http://localhost:3000/api/candidates/upload-v2 ...');
  
  try {
    const response = await fetch('http://localhost:3000/api/candidates/upload-v2', {
      method: 'POST',
      body: formData,
    });

    const text = await response.text();
    console.log('Response Status:', response.status);
    console.log('Raw Response Text (first 500 chars):', text.substring(0, 500));
    
    try {
      const result = JSON.parse(text);
      console.log('Response Data:', JSON.stringify(result, null, 2));

      if (response.ok && result.success) {
        console.log('SUCCESS: Resume uploaded and parsed successfully.');
      } else {
        console.log('FAILED: Upload result indicated failure.');
      }
    } catch (parseError) {
      console.log('FAILED: Response was not valid JSON.');
    }
  } catch (error) {
    console.error('ERROR during upload:', error);
  }
}

testUpload();
