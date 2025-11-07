const fs = require('fs');
const path = require('path');

/**
 * Gets the most recent daily note file before the current date
 */
function getMostRecentDailyNote(currentDate, dailyPath) {
  const files = fs.readdirSync(dailyPath)
    .filter(f => f.endsWith(".md"))
    .map(f => ({
      name: f,
      date: moment(path.basename(f, ".md"), "YYYY-MM-DD")
    }))
    .filter(f => f.date.isValid() && f.date.isBefore(currentDate))
    .sort((a, b) => b.date - a.date); // newest first

  return files.length > 0 ? files[0] : null;
}

/**
 * Checks if a line is a section header
 * Returns an object with the heading level and name, or null if not a header
 */
function isSectionHeader(line) {
  const match = line.match(/^(#{1,3}) (.+)$/);
  if (match) {
    return {
      level: match[1].length,
      hashes: match[1],
      name: match[2]
    };
  }
  return null;
}

/**
 * Checks if a line is a task (completed or incomplete)
 */
function isTask(line) {
  return line.match(/^- \[[ x]\] .+/);
}

/**
 * Checks if a line is an incomplete task
 */
function isIncompleteTask(line) {
  return line.match(/^- \[ \] .+/);
}

/**
 * Checks if a task contains the #daily tag
 */
function isDailyTask(line) {
  return line.includes('#daily');
}

/**
 * Processes a task line based on whether it's a daily task
 */
function processTaskLine(line, sectionName) {
  if (isDailyTask(line)) {
    // For daily tasks, carry over all tasks regardless of completion status
    // Convert completed tasks to incomplete and remove completion dates
    let cleanedLine = line.replace(/^- \[[ x]\]/, '- [ ]');
    
    // Remove completion dates like [completion:: 2025-09-30]
    cleanedLine = cleanedLine.replace(/\s+\[completion::\s+\d{4}-\d{2}-\d{2}\]/g, '');
    
    return cleanedLine;
  } else if (isIncompleteTask(line)) {
    // For other tasks, only carry over incomplete tasks
    return line;
  }
  return null; // Task should not be included
}

/**
 * Parses sections and their tasks from note content
 */
function parseSections(content) {
  const sections = new Map();
  const lines = content.split('\n');
  let currentSection = null;

  for (const line of lines) {
    const sectionMatch = isSectionHeader(line);
    if (sectionMatch) {
      const sectionKey = `${sectionMatch.hashes} ${sectionMatch.name}`;
      currentSection = sectionKey;
      // Initialize section if it doesn't exist
      if (!sections.has(currentSection)) {
        sections.set(currentSection, {
          level: sectionMatch.level,
          hashes: sectionMatch.hashes,
          name: sectionMatch.name,
          tasks: []
        });
      }
    } else if (currentSection && isTask(line)) {
      const processedTask = processTaskLine(line, currentSection);
      if (processedTask) {
        sections.get(currentSection).tasks.push(processedTask);
      }
    }
  }

  // Convert Map to array and filter out empty sections
  return Array.from(sections.values())
    .filter(section => section.tasks.length > 0);
}


/**
 * Formats sections and tasks into the final output
 */
function formatOutput(sections) {
  let result = '';
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    result += `${section.hashes} ${section.name}\n${section.tasks.join('\n')}`;

    // Add spacing after section (except for the last one)
    if (i < sections.length - 1) {
      // Single newline for ### sections, double newline for # and ## sections
      result += section.level === 3 ? '\n' : '\n\n';
    }
  }
  return result;
}

/**
 * Main function
 */ 
module.exports = async function(tp) {
  const vaultPath = app.vault.adapter.basePath; 
  const dailyFolder = "Daily Notes"; // adjust if your daily notes live elsewhere
  const dailyPath = path.join(vaultPath, dailyFolder);

  // Use the filename of the note being created
  const currentFileName = tp.file.title; // e.g., "2025-09-20"
  const currentDate = moment(currentFileName, "YYYY-MM-DD");
  if (!currentDate.isValid()) {
    return "";
  }

  // Get the most recent prior note
  const lastFile = getMostRecentDailyNote(currentDate, dailyPath);
  if (!lastFile) {
    return "";
  }

  const lastPath = path.join(dailyPath, lastFile.name);
  const content = fs.readFileSync(lastPath, "utf-8");

  // Parse sections and their tasks
  const sections = parseSections(content);
  if (sections.length === 0) {
    return "";
  }

  // Format and return the output
  return formatOutput(sections);
}
