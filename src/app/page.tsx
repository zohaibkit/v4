"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  RefreshCw,
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageSquare,
  Video,
  Percent,
  Youtube,
  Search,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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

type MetricType = "gainedViews" | "gainedLikes" | "gainedSubscribers";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData[]>([]);
  const [groupedDataByDate, setGroupedDataByDate] = useState<
    GroupedDataByDate[]
  >([]);
  const [videoSummaryData, setVideoSummaryData] = useState<VideoSummary[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filterOptions, setFilterOptions] = useState<Filters | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefreshTimer, setAutoRefreshTimer] = useState<number>(3600);

  const [selectedSurah, setSelectedSurah] = useState<string>("all");
  const [selectedVideo, setSelectedVideo] = useState<string>("all");
  const [selectedMetric, setSelectedMetric] =
    useState<MetricType>("gainedViews");
  const [dateRange, setDateRange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const url =
        "/api/google-sheets" + (forceRefresh ? "?forceRefresh=true" : "");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log("Fetch timeout - request took too long");
        toast.error("Request timeout - File may be too large");
      }, 120000);

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
        const errorMessage = result.error || "Failed to fetch dashboard data";
        const errorDetails = result.details || "";
        const suggestions = result.suggestions || [];

        console.error("API Error:", errorMessage, errorDetails);

        toast.error(errorMessage, {
          description: errorDetails,
          duration: 10000,
        });

        if (suggestions.length > 0) {
          console.error("Suggestions:");
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
      setAutoRefreshTimer(3600);

      if (
        !dateRange &&
        result.filters.dateRange.min &&
        result.filters.dateRange.max
      ) {
        setDateRange({
          from: result.filters.dateRange.min,
          to: result.filters.dateRange.max,
        });
      }

      if (forceRefresh) {
        toast.success("Dashboard refreshed successfully!");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      if (error instanceof Error) {
        toast.error(error.message, {
          description:
            error.stack?.substring(0, 200) || "Check console for details",
          duration: 8000,
        });
      } else {
        toast.error("Failed to fetch dashboard data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setAutoRefreshTimer((prev) => {
        if (prev <= 0) {
          fetchData();
          return 3600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const filteredData = data.filter((item) => {
    if (selectedSurah !== "all" && item.surahName !== selectedSurah) {
      return false;
    }

    if (selectedVideo !== "all" && item.videoTitle !== selectedVideo) {
      return false;
    }

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

  const filteredSummary = useMemo(() => {
    if (filteredData.length === 0) return null;

    const totalGainedViews = filteredData.reduce(
      (acc, item) => acc + item.gainedViews,
      0,
    );
    const totalGainedLikes = filteredData.reduce(
      (acc, item) => acc + item.gainedLikes,
      0,
    );
    const totalGainedComments = filteredData.reduce(
      (acc, item) => acc + item.gainedComments,
      0,
    );
    const totalGainedSubscribers = filteredData.reduce(
      (acc, item) => acc + item.gainedSubscribers,
      0,
    );

    return {
      totalGainedViews,
      totalGainedLikes,
      totalGainedComments,
      totalGainedSubscribers,
      likeViewRatio:
        totalGainedViews > 0 ? (totalGainedLikes / totalGainedViews) * 100 : 0,
    };
  }, [filteredData]);

  const filteredGroupedData = (() => {
    const grouped = new Map<string, GroupedDataByDate>();

    filteredData.forEach((item) => {
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

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  })();

  const filteredVideoSummaryData = videoSummaryData.filter((video) => {
    if (selectedSurah !== "all" && video.surahName !== selectedSurah) {
      return false;
    }

    if (selectedVideo !== "all" && video.videoTitle !== selectedVideo) {
      return false;
    }

    if (
      searchTerm &&
      !video.videoTitle.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !video.surahName.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toLocaleString();
  };

  const getMetricLabel = (metric: MetricType): string => {
    switch (metric) {
      case "gainedViews":
        return "Gained Views";
      case "gainedLikes":
        return "Gained Likes";
      case "gainedSubscribers":
        return "Gained Subscribers";
    }
  };

  const getGroupedMetricDataKey = (metric: MetricType): string => {
    switch (metric) {
      case "gainedViews":
        return "totalGainedViews";
      case "gainedLikes":
        return "totalGainedLikes";
      case "gainedSubscribers":
        return "totalGainedSubscribers";
    }
  };

  const getMetricColor = (metric: MetricType): string => {
    switch (metric) {
      case "gainedViews":
        return "#0d9488";
      case "gainedLikes":
        return "#d97706";
      case "gainedSubscribers":
        return "#06b6d4";
    }
  };

  const formatDateForChart = (dateString: string): string => {
    try {
      return format(parseISO(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  YouTube Analytics Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time YouTube data integration
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="https://www.youtube.com/@Lets_Learn_Quran_ZA"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors border border-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-400 dark:border-red-900/50"
              >
                <Youtube className="h-5 w-5" />
                <span className="text-sm font-medium">Visit Channel</span>
              </a>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg border border-border">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-foreground">
                  Auto-refresh: {formatTime(autoRefreshTimer)}
                </span>
              </div>

              <Button
                onClick={() => fetchData(true)}
                disabled={loading}
                variant="outline"
                className="gap-2 border-border text-foreground hover:bg-muted"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filters Section */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <Card className="border border-border shadow-md bg-card">
            <CardHeader className="bg-muted border-b border-border">
              <CardTitle className="text-xl font-bold text-foreground">
                Data Filters
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Refine the data view below
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Date Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Date Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange?.from || ""}
                      onChange={(e) =>
                        setDateRange({ ...dateRange!, from: e.target.value })
                      }
                      className="flex-1 px-3 py-2 text-sm border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-foreground font-medium"
                    />
                    <input
                      type="date"
                      value={dateRange?.to || ""}
                      onChange={(e) =>
                        setDateRange({ ...dateRange!, to: e.target.value })
                      }
                      className="flex-1 px-3 py-2 text-sm border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-foreground font-medium"
                    />
                  </div>
                </div>

                {/* Surah Name Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Surah Name
                  </label>
                  <Select
                    value={selectedSurah}
                    onValueChange={setSelectedSurah}
                  >
                    <SelectTrigger className="w-full bg-card text-foreground border-2 border-border font-medium hover:border-primary/50">
                      <SelectValue placeholder="Select Surah" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem
                        value="all"
                        className="font-medium text-foreground"
                      >
                        All Surahs
                      </SelectItem>
                      {filterOptions?.surahNames.map((surah) => (
                        <SelectItem
                          key={surah}
                          value={surah}
                          className="font-medium text-foreground"
                        >
                          {surah}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Video Title Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Video Title
                  </label>
                  <Select
                    value={selectedVideo}
                    onValueChange={setSelectedVideo}
                  >
                    <SelectTrigger className="w-full bg-card text-foreground border-2 border-border font-medium hover:border-primary/50">
                      <SelectValue placeholder="Select Video" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem
                        value="all"
                        className="font-medium text-foreground"
                      >
                        All Videos
                      </SelectItem>
                      {filterOptions?.videoTitles.map((title) => (
                        <SelectItem
                          key={title}
                          value={title}
                          className="font-medium text-foreground"
                        >
                          {title.length > 40
                            ? title.substring(0, 40) + "..."
                            : title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Metric Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">
                    Metric View
                  </label>
                  <Select
                    value={selectedMetric}
                    onValueChange={(value) =>
                      setSelectedMetric(value as MetricType)
                    }
                  >
                    <SelectTrigger className="w-full bg-card text-foreground border-2 border-border font-medium hover:border-primary/50">
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem
                        value="gainedViews"
                        className="font-medium text-foreground"
                      >
                        Gained Views
                      </SelectItem>
                      <SelectItem
                        value="gainedLikes"
                        className="font-medium text-foreground"
                      >
                        Gained Likes
                      </SelectItem>
                      <SelectItem
                        value="gainedSubscribers"
                        className="font-medium text-foreground"
                      >
                        Gained Subscribers
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Last Subscribers */}
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Latest Subscribers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {summary ? formatNumber(summary.lastSubscribers) : "--"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  As of{" "}
                  {summary
                    ? format(parseISO(summary.lastDate), "MMM dd, yyyy")
                    : "--"}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Videos */}
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-amber-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Video className="h-4 w-4 text-amber-500" />
                  Total Videos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {summary ? formatNumber(summary.totalVideos) : "--"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unique videos
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Gained Views */}
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-teal-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4 text-teal-500" />
                  Total Gained Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {filteredSummary
                    ? formatNumber(filteredSummary.totalGainedViews)
                    : "--"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total in filtered data
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Gained Comments */}
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-violet-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-violet-500" />
                  Total Gained Comments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {filteredSummary
                    ? formatNumber(filteredSummary.totalGainedComments)
                    : "--"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total in filtered data
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Gained Likes */}
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-rose-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500" />
                  Total Gained Likes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {filteredSummary
                    ? formatNumber(filteredSummary.totalGainedLikes)
                    : "--"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total in filtered data
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Like/View Ratio */}
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-cyan-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Percent className="h-4 w-4 text-cyan-500" />
                  Like/View Ratio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {filteredSummary !== null
                    ? filteredSummary.likeViewRatio.toFixed(2) + "%"
                    : "--"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredSummary && filteredSummary.totalGainedViews > 0
                    ? `${formatNumber(filteredSummary.totalGainedLikes)} / ${formatNumber(filteredSummary.totalGainedViews)}`
                    : "No data"}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Trend Chart */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <Card className="border-border shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/50 border-b border-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl text-foreground">
                    Trend Analysis
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Track your growth over time (aggregated by date)
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit text-foreground border-border"
                >
                  {getMetricLabel(selectedMetric)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[400px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : filteredGroupedData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available for the selected date range
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredGroupedData}>
                      <defs>
                        <linearGradient
                          id="colorMetric"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={getMetricColor(selectedMetric)}
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor={getMetricColor(selectedMetric)}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDateForChart}
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tickFormatter={formatNumber}
                        stroke="var(--muted-foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        labelFormatter={formatDateForChart}
                        formatter={(value: number) => [
                          formatNumber(value),
                          getMetricLabel(selectedMetric),
                        ]}
                        contentStyle={{
                          backgroundColor: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={getGroupedMetricDataKey(selectedMetric)}
                        stroke={getMetricColor(selectedMetric)}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorMetric)"
                        name={getMetricLabel(selectedMetric)}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Video Summary Table */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <Card className="border-border shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/50 border-b border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl text-foreground">
                    Video Performance Summary
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Aggregated Gained metrics by video (respects filters)
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search video or surah..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredVideoSummaryData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground gap-2">
                  <Search className="h-10 w-10 text-muted-foreground/50" />
                  <p>No video data matches your search or filters</p>
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[40%] font-semibold text-foreground">
                          Video Title
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          <div className="flex items-center justify-end gap-2">
                            <Eye className="h-4 w-4 text-teal-500" />
                            Gained Views
                          </div>
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          <div className="flex items-center justify-end gap-2">
                            <Heart className="h-4 w-4 text-rose-500" />
                            Gained Likes
                          </div>
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          <div className="flex items-center justify-end gap-2">
                            <MessageSquare className="h-4 w-4 text-violet-500" />
                            Gained Comments
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {filteredVideoSummaryData.map((video, index) => (
                          <motion.tr
                            key={video.videoTitle}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.02 }}
                            className={
                              index % 2 === 0 ? "bg-card" : "bg-muted/50"
                            }
                          >
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="text-sm text-foreground line-clamp-2">
                                  {video.videoTitle}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] py-0 h-4 font-normal bg-secondary text-secondary-foreground"
                                  >
                                    {video.surahName}
                                  </Badge>
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-teal-700 dark:text-teal-400 font-semibold">
                              {formatNumber(video.totalGainedViews)}
                            </TableCell>
                            <TableCell className="text-right text-amber-700 dark:text-amber-400 font-semibold">
                              {formatNumber(video.totalGainedLikes)}
                            </TableCell>
                            <TableCell className="text-right text-violet-700 dark:text-violet-400 font-semibold">
                              {formatNumber(video.totalGainedComments)}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Last Refresh Info */}
        <div className="text-center text-sm text-muted-foreground bg-muted/50 py-3 rounded-xl border border-dashed border-border">
          {lastRefresh ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              Last updated:{" "}
              {formatDistanceToNow(lastRefresh, { addSuffix: true })} (
              {format(lastRefresh, "MMM dd, HH:mm:ss")})
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Loading data...
            </span>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <p>
              {filteredSummary
                ? "Totals calculated from filtered data"
                : "Totals calculated from complete dataset"}{" "}
              • Auto-refreshes every 1 hour
            </p>
            <a
              href="https://www.youtube.com/@Lets_Learn_Quran_ZA"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
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
