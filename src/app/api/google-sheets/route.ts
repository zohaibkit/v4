import { NextRequest, NextResponse } from "next/server";

interface ProcessedData {
  date: string;
  videoTitle: string;
  surahName: string;
  subscribers: number;
  views: number;
  likes: number;
  comments: number;
  gainedViews: number;
  gainedLikes: number;
  gainedSubscribers: number;
  gainedComments: number;
}

interface GroupedDataByDate {
  date: string;
  totalGainedViews: number;
  totalGainedLikes: number;
  totalGainedComments: number;
  totalGainedSubscribers: number;
}

interface VideoSummary {
  videoTitle: string;
  surahName: string;
  totalGainedViews: number;
  totalGainedLikes: number;
  totalGainedComments: number;
}

// Function to extract Surah name using REGEXP_REPLACE logic
function extractSurahName(videoTitle: string): string {
  let surahName = videoTitle.trim();

  // Extract everything before first | or digit
  const extractMatch = surahName.match(/^([^|0-9]+)/);
  if (extractMatch) {
    surahName = extractMatch[1].trim();
  }

  // Replace "Word-by-Word Meaning & Translation" with "Surah Al-Fatiha"
  surahName = surahName.replace(
    /Word-by-Word Meaning & Translation/g,
    "Surah Al-Fatiha",
  );

  // Replace "Baqarah" or "Bakara" with "Bakarah"
  surahName = surahName.replace(/Baqarah|Bakara/g, "Bakarah");

  // Remove "Rukuh" with surrounding whitespace
  surahName = surahName.replace(/\s*Rukuh\s*/g, "");

  // Trim trailing whitespace
  surahName = surahName.replace(/\s+$/, "");

  return surahName || "Unknown";
}

// Simple CSV parser for Google Sheets export
function parseCSV(text: string): string[][] {
  // Split by actual newlines (not just \n)
  const rawLines = text.split(/\r?\n/);

  const result: string[][] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue; // Skip empty lines

    // Split by commas that are NOT inside quotes
    const cells: string[] = [];
    let currentCell = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        inQuotes = !inQuotes;
        if (j + 1 < line.length && line[j + 1] === '"') {
          j++; // Skip closing quote
        }
      } else if (char === "," && !inQuotes) {
        cells.push(currentCell);
        currentCell = "";
      } else {
        currentCell += char;
      }
    }

    // Add the last cell
    cells.push(currentCell);

    if (cells.length > 0 || line.trim()) {
      result.push(cells);
    }
  }

  console.log("Parsed lines count:", result.length);
  return result;
}

// Clean cell value - remove quotes and trim
function cleanCell(value: string | undefined): string {
  if (!value) return "";
  // Remove surrounding quotes and whitespace
  return value.replace(/^"|"$/g, "").trim();
}

// Fetch data from Google Sheets via CSV export
async function fetchGoogleSheetsData(): Promise<ProcessedData[]> {
  const spreadsheetId = "1SWYF0Q4bWM5bhpdOjRLcKLRrdI32i3WpCSzRIbLte0o";
  const gid = "0";

  // Fetch as CSV - using direct docs URL that redirects properly
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

  try {
    const response = await fetch(csvUrl, {
      cache: "no-store", // Disable caching to get fresh data
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`,
      );
    }

    const csvText = await response.text();

    // Check if we got HTML (authentication page) instead of CSV
    if (
      csvText.includes("<!DOCTYPE html>") ||
      csvText.includes("<html>") ||
      csvText.includes("Sign in")
    ) {
      throw new Error(
        'Google Sheet requires authentication. Please share sheet with "Anyone with the link" permission.',
      );
    }

    const lines = parseCSV(csvText);
    console.log("Parsed lines count:", lines.length);
    console.log("First line (headers):", lines[0]);
    if (lines.length > 1) {
      console.log("Second line:", lines[1]);
    }

    // Filter out completely empty lines
    const validLines = lines.filter((line) => line && line.length > 0);
    console.log("Valid lines count:", validLines.length);

    if (validLines.length < 2) {
      throw new Error(
        "Not enough data in sheet - need at least headers + 1 data row",
      );
    }

    // Parse headers - clean up quotes and spaces
    const headers = (validLines[0] || []).map((h) => {
      // Remove leading/trailing quotes and extra spaces
      let cleaned = h.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      return cleaned;
    });
    console.log("Headers found:", headers);
    console.log("Headers length:", headers.length);

    // Data lines are all lines after headers
    const dataLines = validLines.slice(1);
    console.log("Data lines count:", dataLines.length);

    // Build column index map for robustness
    const columnMap = new Map<string, number>();
    headers.forEach((header, index) => {
      const key = header.toLowerCase().trim();
      columnMap.set(key, index);
    });

    const getColumnIndex = (colName: string) => {
      const key = colName.toLowerCase().trim();
      const index = columnMap.get(key);
      if (index === undefined) {
        console.log(
          `Warning: Column '${colName}' not found in headers. Available:`,
          Array.from(columnMap.keys()).join(", "),
        );
      }
      return index;
    };

    const dateIndex = getColumnIndex("Date") ?? -1;
    const videoTitleIndex = getColumnIndex("Video Title") ?? -1;
    const subscribersIndex = getColumnIndex("Subscribers") ?? -1;
    const viewsIndex = getColumnIndex("Views") ?? -1;
    const likesIndex = getColumnIndex("Likes") ?? -1;
    const commentsIndex = getColumnIndex("Comments") ?? -1;
    const gainedViewsIndex = getColumnIndex("Gained Views") ?? -1;
    const gainedLikesIndex = getColumnIndex("Gained Likes") ?? -1;
    const gainedCommentsIndex = getColumnIndex("Gained Comments") ?? -1;

    console.log("Column indices:", {
      dateIndex,
      videoTitleIndex,
      subscribersIndex,
      viewsIndex,
      likesIndex,
      commentsIndex,
      gainedViewsIndex,
      gainedLikesIndex,
      gainedCommentsIndex,
    });

    // Parse data rows
    const processedData: ProcessedData[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const row = dataLines[i];

      const date = dateIndex >= 0 ? cleanCell(row[dateIndex]) : "";
      const videoTitle =
        videoTitleIndex >= 0 ? cleanCell(row[videoTitleIndex]) : "";

      // Skip if no date or it's the header row
      if (!date || date.toLowerCase() === "date") {
        console.log(`Skipping row ${i}: no date`);
        continue;
      }

      const subscribers =
        subscribersIndex >= 0
          ? Number(cleanCell(row[subscribersIndex])) || 0
          : 0;
      const views =
        viewsIndex >= 0 ? Number(cleanCell(row[viewsIndex])) || 0 : 0;
      const likes =
        likesIndex >= 0 ? Number(cleanCell(row[likesIndex])) || 0 : 0;
      const comments =
        commentsIndex >= 0 ? Number(cleanCell(row[commentsIndex])) || 0 : 0;

      // Read Gained values directly from columns
      const gainedViews =
        gainedViewsIndex >= 0
          ? Number(cleanCell(row[gainedViewsIndex])) || 0
          : 0;
      const gainedLikes =
        gainedLikesIndex >= 0
          ? Number(cleanCell(row[gainedLikesIndex])) || 0
          : 0;
      const gainedComments =
        gainedCommentsIndex >= 0
          ? Number(cleanCell(row[gainedCommentsIndex])) || 0
          : 0;

      // Calculate gained subscribers from previous row
      const gainedSubscribers =
        processedData.length > 0
          ? Math.max(
              0,
              subscribers - processedData[processedData.length - 1].subscribers,
            )
          : 0;

      processedData.push({
        date,
        videoTitle,
        surahName: extractSurahName(videoTitle),
        subscribers,
        views,
        likes,
        comments,
        gainedViews,
        gainedLikes,
        gainedSubscribers,
        gainedComments,
      });
    }

    // Sort rows by date
    processedData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    console.log(`Processed ${processedData.length} rows from Google Sheet`);
    console.log("Sample data:", processedData.slice(0, 3));

    return processedData;
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error);
    throw error;
  }
}

// Group data by date for trend chart (drill-up functionality)
function groupDataByDate(data: ProcessedData[]): GroupedDataByDate[] {
  const grouped = new Map<string, GroupedDataByDate>();

  data.forEach((item) => {
    const dateKey = item.date;

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, {
        date: dateKey,
        totalGainedViews: 0,
        totalGainedLikes: 0,
        totalGainedComments: 0,
        totalGainedSubscribers: 0,
      });
    }

    const groupedItem = grouped.get(dateKey)!;
    groupedItem.totalGainedViews += item.gainedViews;
    groupedItem.totalGainedLikes += item.gainedLikes;
    groupedItem.totalGainedComments += item.gainedComments;
    groupedItem.totalGainedSubscribers += item.gainedSubscribers;
  });

  // Convert to array and sort by date
  return Array.from(grouped.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

// Group data by video title for video summary table
function groupDataByVideoTitle(data: ProcessedData[]): VideoSummary[] {
  const grouped = new Map<string, VideoSummary>();

  data.forEach((item) => {
    const titleKey = item.videoTitle;

    if (!grouped.has(titleKey)) {
      grouped.set(titleKey, {
        videoTitle: item.videoTitle,
        surahName: item.surahName,
        totalGainedViews: 0,
        totalGainedLikes: 0,
        totalGainedComments: 0,
      });
    }

    const groupedItem = grouped.get(titleKey)!;
    groupedItem.totalGainedViews += item.gainedViews;
    groupedItem.totalGainedLikes += item.gainedLikes;
    groupedItem.totalGainedComments += item.gainedComments;
  });

  // Convert to array and sort by total gained views (descending)
  return Array.from(grouped.values()).sort(
    (a, b) => b.totalGainedViews - a.totalGainedViews,
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    const data = await fetchGoogleSheetsData();

    // Group data by date for trend chart
    const groupedDataByDate = groupDataByDate(data);

    // Group data by video title for video summary table
    const videoSummaryData = groupDataByVideoTitle(data);

    // Calculate summary statistics from COMPLETE dataset
    const lastEntry = data[data.length - 1];
    const uniqueVideoTitles = new Set(data.map((d) => d.videoTitle)).size;

    // Calculate totals from ALL data - these are complete sums
    const totalGainedViews = data.reduce((sum, d) => sum + d.gainedViews, 0);
    const totalGainedComments = data.reduce(
      (sum, d) => sum + d.gainedComments,
      0,
    );
    const totalGainedLikes = data.reduce((sum, d) => sum + d.gainedLikes, 0);

    const likeViewRatio =
      totalGainedViews > 0 ? (totalGainedLikes / totalGainedViews) * 100 : 0;

    // Get unique Surah names for filter
    const uniqueSurahNames = Array.from(
      new Set(data.map((d) => d.surahName)),
    ).sort();

    // Get unique video titles for filter
    const uniqueVideoTitlesArray = Array.from(
      new Set(data.map((d) => d.videoTitle)),
    ).sort();

    const summary = {
      lastSubscribers: lastEntry?.subscribers || 0,
      lastDate: lastEntry?.date || "",
      totalVideos: uniqueVideoTitles,
      totalGainedViews,
      totalGainedComments,
      totalGainedLikes,
      likeViewRatio,
    };

    return NextResponse.json({
      success: true,
      data,
      groupedDataByDate,
      videoSummaryData,
      summary,
      filters: {
        surahNames: uniqueSurahNames,
        videoTitles: uniqueVideoTitlesArray,
        dateRange: {
          min: data[0]?.date || "",
          max: lastEntry?.date || "",
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error);

    // Provide helpful error message
    let errorMessage = "Failed to fetch data from Google Sheets";
    let errorDetails = "Unknown error";

    if (error instanceof Error) {
      errorDetails = error.message;

      // Check for specific error types and provide guidance
      if (
        error.message.includes("HTTP 403") ||
        error.message.includes("HTTP 401")
      ) {
        errorMessage = "Google Sheets access denied";
        errorDetails =
          'The Google Sheet is not publicly accessible. Please share sheet with "Anyone with the link" permission.';
      } else if (error.message.includes("HTTP 404")) {
        errorMessage = "Google Sheet not found";
        errorDetails =
          "The specified spreadsheet ID could not be found. Please check the URL.";
      } else if (error.message.includes("Not enough data")) {
        errorMessage = "Insufficient data";
        errorDetails =
          "The Google Sheet does not contain enough data. Please ensure it has headers and at least one row of data.";
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        suggestions: [
          'Make sure that Google Sheet is shared with "Anyone with the link"',
          "Verify the spreadsheet ID in the URL",
          "Ensure the sheet has the required columns: Date, Video Title, Subscribers, Views, Likes, Comments, Gained Views, Gained Likes, Gained Comments",
        ],
      },
      { status: 500 },
    );
  }
}
