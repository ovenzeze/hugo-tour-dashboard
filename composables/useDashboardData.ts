import { useSupabaseClient } from "#imports";
import { computed, ref } from "vue";

export function useDashboardData() {
  const supabase = useSupabaseClient();
  const dashboardData = ref(null);
  const isLoading = ref(true);
  const error = ref(null);

  // Date range state (for possible future filtering)
  const dateRange = ref({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });

  const fetchDashboardData = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const { data, error: err } = await supabase
        .from("dashboard_combined_view")
        .select("*")
        .single();

      if (err) throw err;

      dashboardData.value = data.dashboard_data;
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      error.value = err;
    } finally {
      isLoading.value = false;
    }
  };

  // Computed properties to extract different sections of dashboard data
  const keyMetrics = computed(() => dashboardData.value?.overall_stats || {});
  const recentItems = computed(() => dashboardData.value?.recent_items || []);
  const topMuseums = computed(() => dashboardData.value?.top_museums || []);
  const languageStats = computed(
    () => dashboardData.value?.language_stats || []
  );
  const topPersonas = computed(() => dashboardData.value?.top_personas || []);

  // Computed properties for chart data
  const museumChartData = computed(() => {
    if (!topMuseums.value.length) return { labels: [], datasets: [] };

    return {
      labels: topMuseums.value.map((m) => m.museum_name),
      datasets: [
        {
          label: "展品",
          data: topMuseums.value.map((m) => m.object_count),
          backgroundColor: "#4f46e5",
        },
        {
          label: "展厅",
          data: topMuseums.value.map((m) => m.gallery_count),
          backgroundColor: "#0ea5e9",
        },
        {
          label: "导览音频",
          data: topMuseums.value.map((m) => m.audio_guide_count),
          backgroundColor: "#10b981",
        },
      ],
    };
  });

  const languageChartData = computed(() => {
    if (!languageStats.value.length) return { labels: [], datasets: [] };

    return {
      labels: languageStats.value.map((l) => l.language),
      datasets: [
        {
          label: "文本",
          data: languageStats.value.map((l) => l.text_count),
          backgroundColor: "#8b5cf6",
        },
        {
          label: "音频",
          data: languageStats.value.map((l) => l.audio_count),
          backgroundColor: "#ec4899",
        },
      ],
    };
  });

  return {
    fetchDashboardData,
    dashboardData,
    isLoading,
    error,
    dateRange,
    keyMetrics,
    recentItems,
    topMuseums,
    languageStats,
    topPersonas,
    museumChartData,
    languageChartData,
  };
}
