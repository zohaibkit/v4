'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, RefreshCw, TrendingUp, Users, Eye, Heart, MessageSquare, Video, Percent, Youtube } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface DashboardData {
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

interface Summary {
  lastSubscribers: number;
  lastDate: string;
  totalVideos: number;
  totalGainedViews: number;
  totalGainedComments: number;
  totalGainedLikes: number;
  likeViewRatio: number;
}

interface Filters {
  surahNames: string[];
  videoTitles: string[];
  dateRange: {
    min: string;
    max: string;
  };
}

interface ApiResponse {
  success: boolean;
  data: DashboardData[];
  groupedDataByDate: GroupedDataByDate[];
  videoSummaryData: VideoSummary[];
  summary: Summary;
  filters: Filters;
  timestamp: string;
  error?: string;
  details?: string;
  suggestions?: string[];
}

type MetricType = 'gainedViews' | 'gainedLikes' | 'gainedSubscribers';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData[]>([]);
  const [groupedDataByDate, setGroupedDataByDate] = useState<GroupedDataByDate[]>([]);
  const [videoSummaryData, setVideoSummaryData] = useState<VideoSummary[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filterOptions, setFilterOptions] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefreshTimer, setAutoRefreshTimer] = useState<number>(3600); // 1 hour in seconds

  // Filters state
  const [selectedSurah, setSelectedSurah] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('gainedViews');
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);

  // Fetch data from Google Sheets API
  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const url = '/api/google-sheets' + (forceRefresh ? '?forceRefresh=true' : '');
      
      // Add timeout for large file handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('Fetch timeout - request took too long');
        toast.error('Request timeout - File may be too large');
      }, 120000); // 2 minute timeout

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        // Display detailed error message with suggestions
        const errorMessage = result.error || 'Failed to fetch dashboard data';
        const errorDetails = result.details || '';
        const suggestions = result.suggestions || [];

        console.error('API Error:', errorMessage, errorDetails);

        // Show toast with error details
        toast.error(errorMessage, {
          description: errorDetails,
          duration: 10000,
        });

        // Log suggestions to console
        if (suggestions.length > 0) {
          console.error('Suggestions:');
          suggestions.forEach((s, i) => console.error(`${i + 1}. ${s}`));
        }

        throw new Error(errorMessage);
      }

      setData(result.data);
      setGroupedDataByDate(result.groupedDataByDate);
      setVideoSummaryData(result.videoSummaryData);
      setSummary(result.summary);
      setFilterOptions(result.filters);
      setLastRefresh(new Date(result.timestamp));
      setAutoRefreshTimer(3600); // Reset timer to 1 hour

      // Initialize date range filter if not set
      if (!dateRange && result.filters.dateRange.min && result.filters.dateRange.max) {
        setDateRange({
          from: result.filters.dateRange.min,
          to: result.filters.dateRange.max,
        });
      }

      if (forceRefresh) {
        toast.success('Dashboard refreshed successfully!');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Show error toast
      if (error instanceof Error) {
        toast.error(error.message, {
          description: error.stack?.substring(0, 200) || 'Check console for details',
          duration: 8000,
        });
      } else {
        toast.error('Failed to fetch dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh every 1 hour
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoRefreshTimer((prev) => {
        if (prev <= 0) {
          fetchData();
          return 3600; // Reset to 1 hour
        }
        return prev - 1;
      });
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Filter data based on selected filters (apply to raw data before grouping)
  const filteredData = data.filter((item) => {
    // Filter by Surah
    if (selectedSurah !== 'all' && item.surahName !== selectedSurah) {
      return false;
    }

    // Filter by Video Title
    if (selectedVideo !== 'all' && item.videoTitle !== selectedVideo) {
      return false;
    }

    // Filter by Date Range
    if (dateRange) {
      const itemDate = parseISO(item.date);
      const fromDate = parseISO(dateRange.from);
      const toDate = parseISO(dateRange.to);

      if (itemDate < fromDate || itemDate > toDate) {
        return false;
      }
    }

    return true;
  });

  // Calculate summary based on filtered data
  const filteredSummary = useMemo(() => {
    if (filteredData.length === 0) return null;

    const totalGainedViews = filteredData.reduce((acc, curr) => acc + curr.gainedViews, 0);
    const totalGainedLikes = filteredData.reduce((acc, curr) => acc + curr.gainedLikes, 0);
    const totalGainedComments = filteredData.reduce((acc, curr) => acc + curr.gainedComments, 0);
    const likeViewRatio = totalGainedViews > 0 ? (totalGainedLikes / totalGainedViews) * 100 : 0;

    return {
      totalGainedViews,
      totalGainedLikes,
      totalGainedComments,
      likeViewRatio,
    };
  }, [filteredData]);

  // Group filtered data by date for trend chart
  const filteredGroupedData = (() => {
    const grouped = new Map<string, GroupedDataByDate>();

    filteredData.forEach(item => {
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

    return Array.from(grouped.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  })();

  // Filter video summary data based on filters
  const filteredVideoSummaryData = videoSummaryData.filter(video => {
    // Filter by Surah
    if (selectedSurah !== 'all' && video.surahName !== selectedSurah) {
      return false;
    }

    // Filter by Video Title
    if (selectedVideo !== 'all' && video.videoTitle !== selectedVideo) {
      return false;
    }

    return true;
  });

  // Format time for display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  // Get metric label
  const getMetricLabel = (metric: MetricType): string => {
    switch (metric) {
      case 'gainedViews':
        return 'Gained Views';
      case 'gainedLikes':
        return 'Gained Likes';
      case 'gainedSubscribers':
        return 'Gained Subscribers';
    }
  };

  // Get metric dataKey for grouped data
  const getGroupedMetricDataKey = (metric: MetricType): string => {
    switch (metric) {
      case 'gainedViews':
        return 'totalGainedViews';
      case 'gainedLikes':
        return 'totalGainedLikes';
      case 'gainedSubscribers':
        return 'totalGainedSubscribers';
    }
  };

  // Get metric color
  const getMetricColor = (metric: MetricType): string => {
    switch (metric) {
      case 'gainedViews':
        return '#8b5cf6';
      case 'gainedLikes':
        return '#ec4899';
      case 'gainedSubscribers':
        return '#14b8a6';
    }
  };

  // Format date for chart
  const formatDateForChart = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">YouTube Analytics Dashboard</h1>
                <p className="text-sm text-slate-600">Real-time YouTube data integration</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* YouTube Channel Link */}
              <a
                href="https://www.youtube.com/@Lets_Learn_Quran_ZA"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
              >
                <Youtube className="h-5 w-5" />
                <span className="text-sm font-medium">Visit Channel</span>
              </a>

              {/* Auto-refresh timer */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-700">
                  Auto-refresh: {formatTime(autoRefreshTimer)}
                </span>
              </div>

              {/* Refresh button */}
              <Button
                onClick={() => fetchData(true)}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filters Section */}
        <Card className="mb-6 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Apply to Trend Chart & Video Table (Summary cards show complete dataset)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange?.from || ''}
                    onChange={(e) => setDateRange({ ...dateRange!, from: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <input
                    type="date"
                    value={dateRange?.to || ''}
                    onChange={(e) => setDateRange({ ...dateRange!, to: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Surah Name Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Surah Name</label>
                <Select value={selectedSurah} onValueChange={setSelectedSurah}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Surahs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Surahs</SelectItem>
                    {filterOptions?.surahNames.map((surah) => (
                      <SelectItem key={surah} value={surah}>
                        {surah}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Video Title Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Video Title</label>
                <Select value={selectedVideo} onValueChange={setSelectedVideo}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Videos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Videos</SelectItem>
                    {filterOptions?.videoTitles.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title.length > 50 ? title.substring(0, 50) + '...' : title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Metric Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Metric</label>
                <Select
                  value={selectedMetric}
                  onValueChange={(value) => setSelectedMetric(value as MetricType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gainedViews">Gained Views</SelectItem>
                    <SelectItem value="gainedLikes">Gained Likes</SelectItem>
                    <SelectItem value="gainedSubscribers">Gained Subscribers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Last Subscribers */}
          <Card className="border-l-4 border-l-violet-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-500" />
                Latest Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {summary ? formatNumber(summary.lastSubscribers) : '--'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                As of {summary ? format(parseISO(summary.lastDate), 'MMM dd, yyyy') : '--'}
              </p>
            </CardContent>
          </Card>

          {/* Total Videos */}
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-500" />
                Total Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {summary ? formatNumber(summary.totalVideos) : '--'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Unique videos</p>
            </CardContent>
          </Card>

          {/* Total Gained Views */}
          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-500" />
                Total Gained Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {filteredSummary ? formatNumber(filteredSummary.totalGainedViews) : '--'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Total in filtered data</p>
            </CardContent>
          </Card>

          {/* Total Gained Comments */}
          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-orange-500" />
                Total Gained Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {filteredSummary ? formatNumber(filteredSummary.totalGainedComments) : '--'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Total in filtered data</p>
            </CardContent>
          </Card>

          {/* Total Gained Likes */}
          <Card className="border-l-4 border-l-pink-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                Total Gained Likes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {filteredSummary ? formatNumber(filteredSummary.totalGainedLikes) : '--'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Total in filtered data</p>
            </CardContent>
          </Card>

          {/* Like/View Ratio */}
          <Card className="border-l-4 border-l-emerald-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Percent className="h-4 w-4 text-emerald-500" />
                Like/View Ratio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {filteredSummary !== null ? filteredSummary.likeViewRatio.toFixed(2) + '%' : '--'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {filteredSummary && filteredSummary.totalGainedViews > 0
                  ? `${formatNumber(filteredSummary.totalGainedLikes)} / ${formatNumber(filteredSummary.totalGainedViews)}`
                  : 'No data'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card className="mb-6 border-slate-200">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-xl">Trend Analysis</CardTitle>
                <CardDescription>Track your growth over time (aggregated by date)</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit">
                {getMetricLabel(selectedMetric)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
                </div>
              ) : filteredGroupedData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  No data available for the selected date range
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredGroupedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateForChart}
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={formatNumber}
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <Tooltip
                      labelFormatter={formatDateForChart}
                      formatter={(value: number) => [formatNumber(value), getMetricLabel(selectedMetric)]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey={getGroupedMetricDataKey(selectedMetric)}
                      stroke={getMetricColor(selectedMetric)}
                      strokeWidth={2}
                      dot={{ fill: getMetricColor(selectedMetric), strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                      name={getMetricLabel(selectedMetric)}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Video Summary Table */}
        <Card className="mb-6 border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl">Video Performance Summary</CardTitle>
            <CardDescription>Aggregated Gained metrics by video (respects filters)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
              </div>
            ) : videoSummaryData.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-slate-500">
                No video data available
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow>
                      <TableHead className="w-[40%] font-semibold">Video Title</TableHead>
                      <TableHead className="text-right font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <Eye className="h-4 w-4 text-purple-500" />
                          Sum of Gained Views
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <Heart className="h-4 w-4 text-pink-500" />
                          Sum of Gained Likes
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <div className="flex items-center justify-end gap-2">
                          <MessageSquare className="h-4 w-4 text-orange-500" />
                          Sum of Gained Comments
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVideoSummaryData.map((video, index) => (
                      <TableRow key={video.videoTitle} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-900">{video.videoTitle}</span>
                            <span className="text-xs text-slate-500">{video.surahName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-purple-600 font-semibold">
                          {formatNumber(video.totalGainedViews)}
                        </TableCell>
                        <TableCell className="text-right text-pink-600 font-semibold">
                          {formatNumber(video.totalGainedLikes)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600 font-semibold">
                          {formatNumber(video.totalGainedComments)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Refresh Info */}
        <div className="text-center text-sm text-slate-500">
          {lastRefresh ? (
            <span>Last updated: {format(lastRefresh, 'MMM dd, yyyy HH:mm:ss')}</span>
          ) : (
            <span>Loading data...</span>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-slate-600">
            <p>{filteredSummary ? 'Totals calculated from filtered data' : 'Totals calculated from complete dataset'} • Auto-refreshes every 1 hour</p>
            <a
              href="https://www.youtube.com/@Lets_Learn_Quran_ZA"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              <Youtube className="h-4 w-4" />
              Visit Channel
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}