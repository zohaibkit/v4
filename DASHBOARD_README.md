# YouTube Analytics Dashboard

A comprehensive dashboard connected to Google Sheets for tracking YouTube analytics data in real-time.

## Features

- 📊 **Real-time Data Integration** - Connects directly to Google Sheets via CSV export
- 📈 **Interactive Trend Charts** - Visualize Gained Views, Gained Likes, and Gained Subscribers over time
- 🎯 **Advanced Filtering** - Filter by date range, Surah name, video title, and metric type
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- 🔄 **Auto-Refresh** - Automatically updates data every 10 minutes
- 🎨 **Beautiful UI** - Built with shadcn/ui components and Tailwind CSS
- 📋 **Summary Cards** - Key metrics at a glance:
  - Latest Subscribers count
  - Total unique videos
  - Total gained views
  - Total gained comments
  - Total gained likes
  - Like/View ratio (percentage)

## Setup Instructions

### 1. Google Sheet Configuration

Your Google Sheet must be publicly accessible for the dashboard to work:

1. Open your Google Sheet
2. Click **Share** in the top right
3. Under **General access**, select **"Anyone with the link"**
4. Set permission to **"Viewer"**
5. Click **Done**

### 2. Required Sheet Columns

The Google Sheet must have the following columns with exact names:

- `Date` - Date of the entry (format: YYYY-MM-DD)
- `Video Title` - Title of the video
- `Subscribers` - Total subscribers count
- `Views` - Total views count
- `Likes` - Total likes count
- `Comments` - Total comments count

### 3. Surah Name Extraction

The dashboard automatically extracts Surah names from video titles using this logic:

```javascript
1. Extract everything before the first | or digit
2. Replace "Word-by-Word Meaning & Translation" with "Surah Al-Fatiha"
3. Replace "Baqarah" or "Bakara" with "Bakarah"
4. Remove "Rukuh" with surrounding whitespace
5. Trim trailing whitespace
```

## How to Use

### Access the Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

### Using Filters

1. **Date Range**: Select start and end dates to filter data
2. **Surah Name**: Choose a specific Surah to view its data
3. **Video Title**: Filter by individual video titles
4. **Metric**: Switch between:
   - Gained Views
   - Gained Likes
   - Gained Subscribers

### Refresh Data

- **Manual Refresh**: Click the "Refresh" button in the header
- **Auto-Refresh**: The dashboard automatically updates every 10 minutes
- The timer shows the countdown until the next automatic refresh

## API Endpoints

### GET `/api/google-sheets`

Fetches data from Google Sheets and returns processed analytics data.

**Query Parameters:**
- `forceRefresh` (optional): Set to `true` to bypass cache and fetch fresh data

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "videoTitle": "Surah Al-Fatiha - Word by Word",
      "surahName": "Surah Al-Fatiha",
      "subscribers": 1000,
      "views": 5000,
      "likes": 200,
      "comments": 50,
      "gainedViews": 100,
      "gainedLikes": 10,
      "gainedSubscribers": 5,
      "gainedComments": 2
    }
  ],
  "summary": {
    "lastSubscribers": 1000,
    "lastDate": "2024-01-01",
    "totalVideos": 10,
    "totalGainedViews": 5000,
    "totalGainedComments": 250,
    "totalGainedLikes": 1000,
    "likeViewRatio": 20.0
  },
  "filters": {
    "surahNames": ["Surah Al-Fatiha", "Surah Bakarah"],
    "videoTitles": ["Video 1", "Video 2"],
    "dateRange": {
      "min": "2024-01-01",
      "max": "2024-12-31"
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Troubleshooting

### "Google Sheets access denied" Error

**Problem**: The dashboard cannot access the Google Sheet.

**Solution**:
1. Make sure the sheet is shared with "Anyone with the link" permission
2. Verify the spreadsheet ID in the API route (`src/app/api/google-sheets/route.ts`)
3. Check that the sheet contains the required columns

### "Not enough data in the sheet" Error

**Problem**: The sheet doesn't have enough rows or is missing headers.

**Solution**:
1. Ensure the sheet has headers in the first row
2. Add at least one row of data below the headers
3. Verify all required columns are present

### Dashboard Shows No Data

**Problem**: The filters might be too restrictive.

**Solution**:
1. Reset all filters to "All"
2. Check the date range - try selecting a broader range
3. Verify data exists in the Google Sheet

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Date Handling**: date-fns
- **State Management**: React Hooks
- **Notifications**: Sonner

## Customization

### Changing the Google Sheet

Edit the `spreadsheetId` variable in `src/app/api/google-sheets/route.ts`:

```typescript
const spreadsheetId = 'YOUR_SPREADSHEET_ID_HERE';
const gid = '0'; // Change if using a different tab
```

### Adding New Metrics

1. Add the metric to the `MetricType` type in `src/app/page.tsx`
2. Update the API to calculate the new metric
3. Add the metric to the filter options
4. Update the chart to display the new metric

### Customizing Colors

Edit the `getMetricColor` function in `src/app/page.tsx`:

```typescript
const getMetricColor = (metric: MetricType): string => {
  switch (metric) {
    case 'gainedViews':
      return '#8b5cf6'; // Violet
    case 'gainedLikes':
      return '#ec4899'; // Pink
    case 'gainedSubscribers':
      return '#14b8a6'; // Teal
    // Add your custom colors here
  }
};
```

## Performance

- The dashboard fetches fresh data from Google Sheets on every refresh
- Auto-refresh occurs every 10 minutes to balance freshness with API limits
- Data is processed on the server to minimize client-side computation
- Chart rendering is optimized with Recharts responsive container

## License

This project is part of the Z.ai Code Scaffold.
