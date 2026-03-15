const { execSync } = require('child_process');

try {
  const output = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', { encoding: 'utf8' });
  console.log(output);
} catch (error) {
  console.error('Error details:', error.stdout, error.stderr);
}
