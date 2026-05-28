import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const CALENDAR_PATH = path.join(__dirname, '../marketing/daily_social_calendar.md');

function parseDailyCampaign(targetDay) {
  try {
    if (!fs.existsSync(CALENDAR_PATH)) {
      throw new Error(`Social calendar file not found at: ${CALENDAR_PATH}`);
    }

    const fileContent = fs.readFileSync(CALENDAR_PATH, 'utf8');
    
    // Quick regex parser to extract sections
    const dayMarker = `### Day ${targetDay}:`;
    const nextDayMarker = `### Day ${targetDay + 1}:`;
    
    const startIndex = fileContent.indexOf(dayMarker);
    if (startIndex === -1) {
      throw new Error(`Could not find campaign content for Day ${targetDay}`);
    }

    let endIndex = fileContent.indexOf(nextDayMarker, startIndex);
    if (endIndex === -1) {
      endIndex = fileContent.length; // Final day of the month
    }

    const campaignBlock = fileContent.substring(startIndex, endIndex);

    // Extract basic meta variables
    const targetSegment = campaignBlock.match(/- \*\*Target Segment:\*\* (.*)/)?.[1] || "All Businesses";
    const theme = campaignBlock.match(/- \*\*Theme:\*\* (.*)/)?.[1] || "ezSignNow Value Play";
    
    // Extract Twitter/X Block
    const twitterStart = campaignBlock.indexOf('```text', campaignBlock.indexOf('Twitter/X Copy:'));
    const twitterEnd = campaignBlock.indexOf('```', twitterStart + 7);
    const twitterCopy = campaignBlock.substring(twitterStart + 7, twitterEnd).trim();

    // Extract LinkedIn Block
    const linkedinStart = campaignBlock.indexOf('```text', campaignBlock.indexOf('LinkedIn Copy:'));
    const linkedinEnd = campaignBlock.indexOf('```', linkedinStart + 7);
    const linkedinCopy = campaignBlock.substring(linkedinStart + 7, linkedinEnd).trim();

    // Extract Visual details
    const visualDetails = campaignBlock.match(/- \*\*Visual:\*\* (.*)/)?.[1] || "Poster Showcase";

    return {
      day: targetDay,
      segment: targetSegment,
      theme: theme,
      twitter: twitterCopy,
      linkedin: linkedinCopy,
      visual: visualDetails
    };
  } catch (error) {
    console.error(`[Social Scheduler Error] ${error.message}`);
    return null;
  }
}

function runScheduler() {
  console.log('====================================================');
  console.log('      ezSignNow Daily GTM Social Media Dispatcher    ');
  console.log('====================================================');

  // Calculate current campaign index based on the day of the month (1-30)
  const today = new Date();
  const dayOfMonth = today.getDate();
  const targetCampaignDay = ((dayOfMonth - 1) % 30) + 1;

  console.log(`Date: ${today.toDateString()}`);
  console.log(`Active Social Campaign Day: Day ${targetCampaignDay} / 30\n`);

  const campaign = parseDailyCampaign(targetCampaignDay);
  
  if (campaign) {
    console.log('----------------------------------------------------');
    console.log(`🎯 TARGET SEGMENT : ${campaign.segment}`);
    console.log(`💡 THEME          : ${campaign.theme}`);
    console.log('----------------------------------------------------');
    
    console.log('\n🐦 TWITTER/X COPY DISPATCH:');
    console.log('----------------------------------------------------');
    console.log(campaign.twitter);
    console.log('----------------------------------------------------');
    
    console.log('\n💼 LINKEDIN PROFESSIONAL STORY DISPATCH:');
    console.log('----------------------------------------------------');
    console.log(campaign.linkedin);
    console.log('----------------------------------------------------');
    
    console.log(`\n🖼️ RECOMMENDED VISUAL POSTER: ${campaign.visual}`);
    console.log('----------------------------------------------------');
    console.log('⚡ Simulated Webhook status: Vetted post successfully loaded in schedule queue!');
  }
  
  console.log('====================================================');
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runScheduler();
}

export { parseDailyCampaign };
