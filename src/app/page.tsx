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
import { Calendar, RefreshCw, TrendingUp, Users, Eye, Heart, MessageSquare, Video, Percent, Youtube, RotateCcw } from 'lucide-react';
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
  const [dateFilterType, setDateFilterType] = useState<'today' | 'last6Days' | 'thisMonth' | 'all'>('all');

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
          duration: 8000,
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

  // Computed values for filtered data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
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

      // Filter by Quick Date Filters
      if (dateFilterType !== 'all') {
        const itemDate = parseISO(item.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilterType === 'today') {
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
          
          if (itemDate < todayStart || itemDate > todayEnd) {
            return false;
          }
        } else if (dateFilterType === 'last6Days') {
          const last6Days = new Date(today);
          last6Days.setDate(today.getDate() - 6);
          last6Days.setHours(0, 0, 0, 0);

          if (itemDate < last6Days) {
            return false;
          }
        } else if (dateFilterType === 'thisMonth') {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

          if (itemDate < monthStart || itemDate >= monthEnd) {
            return false;
          }
        }
      }

      return true;
    });
  }, [data, selectedSurah, selectedVideo, dateRange, dateFilterType]);

  // Computed values for filtered video titles
  const filteredVideoTitles = useMemo(() => {
    if (selectedSurah === 'all') {
      return filterOptions?.videoTitles || [];
    }
    
    // When a specific Surah is selected, default to showing "All Videos" from that Surah
    // This ensures the video title filter has a valid default option
    return filterOptions?.videoTitles.filter(title => {
      const video = data.find(v => v.videoTitle === title);
      return video?.surahName === selectedSurah;
    }) || [];
  }, [selectedSurah, data, filterOptions]);

  // Reset selectedVideo and date filter type when Surah changes
  useEffect(() => {
    if (selectedSurah !== 'all') {
      // Check if current selectedVideo is still valid (belongs to selected Surah)
      const currentVideoValid = filteredVideoTitles.includes(selectedVideo);
      if (!currentVideoValid) {
        // Reset to 'all' to show all videos from selected Surah
        setSelectedVideo('all');
      }
      
      // Clear quick date filter when Surah changes
      setDateFilterType('all');
    }
  }, [selectedSurah, filteredVideoTitles]);

  // Group filtered data by date for trend chart
  const filteredGroupedData = useMemo(() => {
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
  }, [filteredData]);

  // Reset filters function
  const resetFilters = () => {
    setSelectedSurah('all');
    setSelectedVideo('all');
    setSelectedMetric('gainedViews');
    setDateFilterType('all');
    setDateRange(null);
    toast.success('Filters reset successfully!');
  };

  // Filter video summary data based on filters (already respects both filters)
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

  // Compute filtered summary statistics
  const filteredSummary = useMemo(() => {
    const filteredVideos = filteredData;

    return {
      lastSubscribers: filteredVideos.length > 0 ? Math.max(...filteredVideos.map(v => v.subscribers)) : 0,
      lastDate: filteredVideos.length > 0 ? filteredVideos[filteredVideos.length - 1].date : '',
      totalVideos: new Set(filteredVideos.map(v => v.videoTitle)).size,
      totalGainedViews: filteredVideos.reduce((sum, v) => sum + v.gainedViews, 0),
      totalGainedComments: filteredVideos.reduce((sum, v) => sum + v.gainedComments, 0),
      totalGainedLikes: filteredVideos.reduce((sum, v) => sum + v.gainedLikes, 0),
      likeViewRatio: filteredVideos.reduce((sum, v) => sum + v.gainedViews, 0) > 0
        ? (filteredVideos.reduce((sum, v) => sum + v.gainedLikes, 0) / filteredVideos.reduce((sum, v) => sum + v.gainedViews, 0)) * 100
        : 0,
    };
  }, [filteredData]);

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

  // Format date for chart and display
  const formatDateForChart = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatDateForDisplay = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

              {/* Portfolio Link */}
              <a
                href="https://zohaib-ur-rehman-khan.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium">🌐 Portfolio</span>
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
          <CardHeader className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>All filters are connected and work together</CardDescription>
            </div>
            <Button
              onClick={resetFilters}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <span className="text-xs flex items-center gap-2">
                <RotateCcw className="h-3 w-3" />
                Reset All Filters
              </span>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Quick Date Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Quick Date</label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setDateFilterType('today')}
                    variant={dateFilterType === 'today' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    Today
                  </Button>
                  <Button
                    onClick={() => setDateFilterType('last6Days')}
                    variant={dateFilterType === 'last6Days' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    Last 6 Days
                  </Button>
                  <Button
                    onClick={() => setDateFilterType('thisMonth')}
                    variant={dateFilterType === 'thisMonth' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    This Month
                  </Button>
                  <Button
                    onClick={() => setDateFilterType('all')}
                    variant={dateFilterType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                  >
                    All Data
                  </Button>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Custom Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange?.from || ''}
                    onChange={(e) => {
                      setDateRange({ ...dateRange!, from: e.target.value });
                      setDateFilterType('all'); // Clear quick filter when custom range is used
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    disabled={dateFilterType !== 'all'}
                  />
                  <input
                    type="date"
                    value={dateRange?.to || ''}
                    onChange={(e) => {
                      setDateRange({ ...dateRange!, to: e.target.value });
                      setDateFilterType('all'); // Clear quick filter when custom range is used
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                    disabled={dateFilterType !== 'all'}
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
                    <SelectValue placeholder={selectedSurah === 'all' ? "All Videos" : "All Videos in Surah"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Videos</SelectItem>
                    {filteredVideoTitles.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title.length > 30 ? title.substring(0, 30) + '...' : title}
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

        {/* Filters Active Indicator */}
        {(selectedSurah !== 'all' || selectedVideo !== 'all' || dateRange !== null || dateFilterType !== 'all') && (
          <div className="md:col-span-2 lg:col-span-4 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-blue-700">Filters Applied:</span>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-blue-600">
              {selectedSurah !== 'all' && (
                <Badge variant="secondary">Surah: {selectedSurah}</Badge>
              )}
              {selectedVideo !== 'all' && (
                <Badge variant="secondary">Video: {selectedVideo.length > 20 ? selectedVideo.substring(0, 20) + '...' : selectedVideo}</Badge>
              )}
              {dateRange && (
                <Badge variant="secondary">
                  Date: {dateRange.from} - {dateRange.to}
                </Badge>
              )}
              {dateFilterType !== 'all' && (
                <Badge variant="secondary">
                  Time: {dateFilterType === 'today' ? 'Today' : dateFilterType === 'last6Days' ? 'Last 6 days' : 'This Month'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-blue-600">All filters are connected and work together</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Latest Subscribers */}
          <Card className="border-l-4 border-l-violet-500 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-500" />
                Latest Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {filteredSummary ? formatNumber(filteredSummary.lastSubscribers) : '--'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {filteredSummary ? `As of ${formatDateForDisplay(filteredSummary.lastDate)}` : '--'}
                <span className="text-slate-400">
                  {selectedSurah !== 'all' || selectedVideo !== 'all' || dateRange !== null || dateFilterType !== 'all' ? '(filtered data)' : '(complete dataset)'}
                </span>
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
                {filteredSummary ? formatNumber(filteredSummary.totalVideos) : '--'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Unique videos in filtered data</p>
              <span className="text-slate-400">
                {selectedSurah !== 'all' || selectedVideo !== 'all' || dateRange !== null || dateFilterType !== 'all' ? '(filtered data)' : '(complete dataset)'}
              </span>
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
              <span className="text-slate-400">
                {selectedSurah !== 'all' || selectedVideo !== 'all' || dateRange !== null || dateFilterType !== 'all' ? '(filtered data)' : '(complete dataset)'}
              </span>
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
              <span className="text-slate-400">
                {selectedSurah !== 'all' || selectedVideo !== 'all' || dateRange !== null || dateFilterType !== 'all' ? '(filtered data)' : '(complete dataset)'}
              </span>
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
              <span className="text-slate-400">
                {selectedSurah !== 'all' || selectedVideo !== 'all' || dateRange !== null || dateFilterType !== 'all' ? '(filtered data)' : '(complete dataset)'}
              </span>
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
                <CardDescription>Track your growth over time • All filters are connected</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-fit">
                  {getMetricLabel(selectedMetric)}
                </Badge>
                {/* Metric Type Filter Buttons */}
                <div className="flex gap-1 ml-4">
                  <Button
                    onClick={() => setSelectedMetric('gainedViews')}
                    variant={selectedMetric === 'gainedViews' ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Views
                  </Button>
                  <Button
                    onClick={() => setSelectedMetric('gainedLikes')}
                    variant={selectedMetric === 'gainedLikes' ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1"
                  >
                    <Heart className="h-3 w-3" />
                    Likes
                  </Button>
                  <Button
                    onClick={() => setSelectedMetric('gainedSubscribers')}
                    variant={selectedMetric === 'gainedSubscribers' ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1"
                  >
                    <Users className="h-3 w-3" />
                    Subscribers
                  </Button>
                </div>
              </div>
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
                  No data available for the selected filters
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
                      labelFormatter={formatDateForDisplay}
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
            <CardDescription>Aggregated metrics by video (respects all filters)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
              </div>
            ) : filteredVideoSummaryData.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-slate-500">
                No video data available for the selected filters
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
            <span>Last updated: {formatDateForDisplay(lastRefresh)}</span>
          ) : (
            <span>Loading data...</span>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-slate-600">
            <p>
              {filteredSummary 
                ? 'Totals calculated from filtered data' 
                : 'Totals calculated from complete dataset'} • Auto-refresh every 1 hour
            </p>
            <a
              href="https://www.youtube.com/@Lets_Learn_Quran_ZA"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              <Youtube className="h-4 w-4" />
              Visit Channel
            </a>
            <a
              href="https://your-portfolio-link.com" // Replace with your actual portfolio URL
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              <span className="text-lg">🌐</span>
              Portfolio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
