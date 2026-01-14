# Dashboard Setup Summary

## ✅ What Has Been Built

A complete YouTube Analytics Dashboard with the following features:

### 1. **Backend API** (`/api/google-sheets`)
   - Fetches data from Google Sheets via CSV export
   - Implements Surah name extraction logic using REGEXP_REPLACE
   - Calculates gained metrics (views, likes, subscribers, comments)
   - Provides summary statistics
   - Includes comprehensive error handling and helpful suggestions

### 2. **Frontend Dashboard** (`/page.tsx`)
   - Beautiful, responsive UI built with shadcn/ui and Tailwind CSS
   - **6 Summary Cards**:
     - Latest Subscribers
     - Total Videos (unique by title)
     - Total Gained Views
     - Total Gained Comments
     - Total Gained Likes
     - Like/View Ratio (percentage)
   
   - **Interactive Trend Chart**:
     - Shows trends over time
     - Switchable between: Gained Views, Gained Likes, Gained Subscribers
     - Formatted tooltips and axes
   
   - **Advanced Filters**:
     - Date range picker
     - Surah name filter (auto-extracted from titles)
     - Video title filter
     - Metric type selector
   
   - **Auto-Refresh System**:
     - Manual refresh button
     - Automatic refresh every 10 minutes
     - Visual countdown timer
     - Last updated timestamp

### 3. **Surah Name Extraction Logic**

The dashboard automatically extracts Surah names from video titles using the exact logic you specified:

```
1. Extract everything before first | or digit
2. Replace "Word-by-Word Meaning & Translation" → "Surah Al-Fatiha"
3. Replace "Baqarah" or "Bakara" → "Bakarah"
4. Remove "Rukuh" with surrounding whitespace
5. Trim trailing whitespace
```

## ⚠️ Important: Google Sheet Access Issue

Currently, the Google Sheet at:
```
https://docs.google.com/spreadsheets/d/1SWYF0Q4bWM5bhpdOjRLcKLRrdI32i3WpCSzRIbLte0o
```

Is **not publicly accessible**, which causes a 401 Unauthorized error when trying to fetch data.

### To Fix This:

You have two options:

#### Option 1: Make the Sheet Public (Recommended)

1. Open the Google Sheet
2. Click **Share** in the top right corner
3. Under **General access**, select **"Anyone with the link"**
4. Set permission to **"Viewer"**
5. Click **Done**

The dashboard will automatically start working once the sheet is public.

#### Option 2: Use Google Sheets API (Advanced)

If you cannot make the sheet public, you can use the Google Sheets API:

1. Create a Google Cloud project
2. Enable the Google Sheets API
3. Create credentials (service account or API key)
4. Share the sheet with the service account email
5. Update the API route to use the API with authentication

## 📋 Required Google Sheet Format

Your Google Sheet must have these **exact** column names:

| Column Name | Description | Format |
|-------------|-------------|---------|
| Date | Date of entry | YYYY-MM-DD |
| Video Title | Title of the video | Text |
| Subscribers | Total subscribers | Number |
| Views | Total views | Number |
| Likes | Total likes | Number |
| Comments | Total comments | Number |

The first row should contain headers, followed by data rows.

## 🚀 How to Use the Dashboard

Once the Google Sheet is accessible:

1. **View Dashboard**: Open `http://localhost:3000`

2. **Apply Filters**:
   - Select date range to see specific periods
   - Choose a Surah to filter by Surah name
   - Select a specific video title
   - Switch between Gained Views, Gained Likes, Gained Subscribers

3. **Refresh Data**:
   - Click the "Refresh" button for manual refresh
   - Wait for automatic refresh (every 10 minutes)
   - The countdown timer shows when next refresh will occur

## 📊 Understanding the Metrics

### Gained Metrics
The dashboard calculates "gained" values by comparing each day's data with the previous day:
- **Gained Views** = Today's views - Yesterday's views
- **Gained Likes** = Today's likes - Yesterday's likes
- **Gained Subscribers** = Today's subscribers - Yesterday's subscribers

### Summary Cards
- **Latest Subscribers**: The most recent subscriber count
- **Total Videos**: Count of unique video titles in the sheet
- **Total Gained Views**: Sum of all gained views across all entries
- **Total Gained Comments**: Sum of all gained comments across all entries
- **Total Gained Likes**: Sum of all gained likes across all entries
- **Like/View Ratio**: (Total Gained Likes / Total Gained Views) × 100%

## 🎨 Dashboard Features

### Responsive Design
- Mobile-first approach
- Works on all screen sizes
- Touch-friendly controls

### Visual Design
- Clean, modern interface
- Color-coded metrics
- Smooth animations and transitions
- Professional card layouts

### User Experience
- Loading states and skeletons
- Error messages with helpful suggestions
- Toast notifications for actions
- Intuitive filter controls

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── google-sheets/
│   │       └── route.ts          # Google Sheets API endpoint
│   ├── page.tsx                   # Dashboard page
│   └── layout.tsx                 # Root layout
├── components/
│   └── ui/                        # shadcn/ui components
```

## 🔧 Customization Options

### Change Google Sheet ID
Edit `src/app/api/google-sheets/route.ts`:
```typescript
const spreadsheetId = 'YOUR_SPREADSHEET_ID';
const gid = '0'; // Tab number (0 for first tab)
```

### Change Auto-Refresh Interval
Edit `src/app/page.tsx`:
```typescript
setAutoRefreshTimer(600); // 600 seconds = 10 minutes
```

### Modify Surah Extraction Logic
Edit the `extractSurahName` function in `src/app/api/google-sheets/route.ts`

### Add New Metrics
1. Add metric type to `MetricType` in `src/app/page.tsx`
2. Update API to calculate the metric
3. Add to chart and filters

## 📈 Next Steps

1. **Make the Google Sheet public** to enable data fetching
2. **Verify data format** matches the required column names
3. **Test the dashboard** with different filters
4. **Customize colors and styling** if needed
5. **Add more metrics** if you want additional analytics

## 🐛 Troubleshooting

### Dashboard shows error
- Check that the Google Sheet is publicly accessible
- Verify the spreadsheet ID is correct
- Ensure required columns exist in the sheet

### No data appears
- Check filters - try resetting them to "All"
- Verify date range includes data
- Check browser console for errors

### Auto-refresh not working
- Refresh the page
- Check browser console for JavaScript errors
- Ensure network connection is stable

## 💡 Tips

- The dashboard works best with daily data entries
- Sort your Google Sheet by date for better visualization
- Use consistent video titles for accurate Surah extraction
- Keep the Google Sheet updated regularly for fresh data

## 📞 Support

For issues or questions, refer to `DASHBOARD_README.md` for detailed documentation.
