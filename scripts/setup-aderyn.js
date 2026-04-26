const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Script to set up Aderyn security auditing tool
 * This will install Aderyn and run initial security analysis
 */

async function main() {
  console.log("🔒 Setting up Aderyn Security Auditing");
  
  const contractsDir = path.join(__dirname, '../contracts');
  
  try {
    // Check if Aderyn is installed
    console.log("📋 Checking Aderyn installation...");
    
    try {
      execSync('aderyn --version', { stdio: 'pipe' });
      console.log("✅ Aderyn is already installed");
    } catch (error) {
      console.log("📦 Installing Aderyn...");
      
      // Install Aderyn using cargo
      try {
        execSync('cargo install aderyn', { stdio: 'inherit' });
        console.log("✅ Aderyn installed successfully");
      } catch (installError) {
        console.log("⚠️  Could not install Aderyn via cargo. Please install manually:");
        console.log("   1. Install Rust: https://rustup.rs/");
        console.log("   2. Run: cargo install aderyn");
        console.log("   3. Or download from: https://github.com/Cyfrin/aderyn");
        return;
      }
    }
    
    // Compile contracts first
    console.log("\n🔨 Compiling contracts...");
    process.chdir(contractsDir);
    execSync('npm run compile', { stdio: 'inherit' });
    
    // Run Aderyn analysis
    console.log("\n🔍 Running Aderyn security analysis...");
    
    const aderynCommand = 'aderyn . --output aderyn-report.json';
    
    try {
      const output = execSync(aderynCommand, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      console.log("✅ Aderyn analysis completed");
      console.log(output);
      
      // Read and display the report
      const reportPath = path.join(contractsDir, 'aderyn-report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        
        console.log("\n📊 Security Analysis Summary:");
        console.log("=" .repeat(50));
        
        if (report.issues && report.issues.length > 0) {
          const severityCounts = {
            high: 0,
            medium: 0,
            low: 0,
            info: 0
          };
          
          report.issues.forEach(issue => {
            const severity = issue.severity?.toLowerCase() || 'info';
            severityCounts[severity] = (severityCounts[severity] || 0) + 1;
          });
          
          console.log(`🔴 High Severity: ${severityCounts.high}`);
          console.log(`🟡 Medium Severity: ${severityCounts.medium}`);
          console.log(`🟢 Low Severity: ${severityCounts.low}`);
          console.log(`ℹ️  Info: ${severityCounts.info}`);
          
          // Display critical issues
          const criticalIssues = report.issues.filter(
            issue => issue.severity?.toLowerCase() === 'high'
          );
          
          if (criticalIssues.length > 0) {
            console.log("\n🚨 Critical Issues Found:");
            criticalIssues.forEach((issue, index) => {
              console.log(`${index + 1}. ${issue.title}`);
              console.log(`   File: ${issue.file}`);
              console.log(`   Description: ${issue.description}`);
              console.log("");
            });
          }
          
          // Check for specific issues relevant to our use case
          const timestampIssues = report.issues.filter(
            issue => issue.title?.toLowerCase().includes('timestamp') ||
                    issue.description?.toLowerCase().includes('timestamp')
          );
          
          const gaslessIssues = report.issues.filter(
            issue => issue.title?.toLowerCase().includes('gasless') ||
                    issue.title?.toLowerCase().includes('gas') ||
                    issue.description?.toLowerCase().includes('gasless')
          );
          
          if (timestampIssues.length > 0) {
            console.log("⏰ Timestamp Dependency Issues:");
            timestampIssues.forEach(issue => {
              console.log(`   - ${issue.title}: ${issue.description}`);
            });
          }
          
          if (gaslessIssues.length > 0) {
            console.log("⛽ Gas-related Issues:");
            gaslessIssues.forEach(issue => {
              console.log(`   - ${issue.title}: ${issue.description}`);
            });
          }
          
        } else {
          console.log("✅ No security issues found!");
        }
        
        console.log("\n📄 Full report saved to: aderyn-report.json");
        
      } else {
        console.log("⚠️  Report file not found");
      }
      
    } catch (aderynError) {
      console.log("❌ Aderyn analysis failed:");
      console.log(aderynError.message);
    }
    
    // Create mitigation recommendations
    console.log("\n💡 Security Recommendations:");
    console.log("=" .repeat(50));
    console.log("1. Timestamp Dependency Mitigation:");
    console.log("   - Use block.timestamp carefully for time-sensitive operations");
    console.log("   - Consider using block numbers for relative timing");
    console.log("   - Implement tolerance ranges for time-based checks");
    console.log("");
    console.log("2. Gasless Send Prevention:");
    console.log("   - Always check return values of external calls");
    console.log("   - Use proper error handling for failed transactions");
    console.log("   - Implement circuit breakers for critical operations");
    console.log("");
    console.log("3. Temperature Tracking Security:");
    console.log("   - Validate temperature ranges before processing");
    console.log("   - Implement rate limiting for temperature updates");
    console.log("   - Use events for audit trails");
    
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });