import { ref, computed } from 'vue';
import type { Persona } from '~/types/persona'; // Ensure this path is correct for your Persona type definition

// Module-scoped cache and state
const personasCache = ref<Persona[]>([]);
const isLoading = ref(false);
const lastFetchTime = ref(0);
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

export function usePersonaCache() {
  const isCacheStale = computed(() => {
    return (
      personasCache.value.length === 0 ||
      Date.now() - lastFetchTime.value > CACHE_DURATION
    );
  });

  async function fetchPersonas(forceRefresh = false) {
    if ((isCacheStale.value || forceRefresh) && !isLoading.value) {
      isLoading.value = true;
      try {
        // Assuming your API endpoint for fetching active personas is /api/personas
        // Adjust if necessary
        const data = await $fetch<Persona[]>('/api/personas?active=true');
        personasCache.value = data || []; // Ensure cache is always an array
        lastFetchTime.value = Date.now();
        return personasCache.value;
      } catch (error) {
        console.error('Failed to fetch personas:', error);
        // Depending on your error handling strategy, you might want to throw the error
        // or return an empty array / previously cached data.
        return personasCache.value; // Return existing cache on error to prevent breaking UI
      } finally {
        isLoading.value = false;
      }
    }
    return personasCache.value;
  }

  function getPersonaById(id: number | string): Persona | undefined {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (isNaN(numericId)) return undefined;
    return personasCache.value.find(p => p.persona_id === numericId);
  }

  function getPersonaByName(name: string): Persona | undefined {
    if (!name) return undefined;
    return personasCache.value.find(
      p => p.name?.toLowerCase() === name.toLowerCase()
    );
  }

  function invalidateCache() {
    lastFetchTime.value = 0; // Mark cache as stale
    personasCache.value = []; // Optionally clear existing data
  }

  // 🔧 新增：按语言过滤personas
  function getPersonasByLanguage(languageCode: string): Persona[] {
    if (!languageCode) return personasCache.value;
    
    return personasCache.value.filter(persona => {
      // 检查 language_support 字段
      if (persona.language_support && Array.isArray(persona.language_support)) {
        return persona.language_support.includes(languageCode);
      }
      return false; // 如果没有语言支持信息，则不包含
    });
  }

  // 🔧 新增：按语言随机选择一个persona
  function getRandomPersonaByLanguage(languageCode: string): Persona | undefined {
    const filteredPersonas = getPersonasByLanguage(languageCode);
    if (filteredPersonas.length === 0) return undefined;
    
    const randomIndex = Math.floor(Math.random() * filteredPersonas.length);
    return filteredPersonas[randomIndex];
  }

  // 🔧 新增：获取所有支持的语言列表
  function getSupportedLanguages(): string[] {
    const languages = new Set<string>();
    personasCache.value.forEach(persona => {
      if (persona.language_support && Array.isArray(persona.language_support)) {
        persona.language_support.forEach(lang => languages.add(lang));
      }
    });
    return Array.from(languages).sort();
  }

  // 🔧 新增：获取推荐的Host personas
  function getRecommendedHosts(languageCode: string): Persona[] {
    if (!languageCode) return [];
    
    return personasCache.value
      .filter(persona => {
        // 检查是否推荐为Host且支持该语言
        const isRecommendedHost = persona.is_recommended_host === true;
        const supportsLanguage = persona.language_support && 
          Array.isArray(persona.language_support) && 
          persona.language_support.includes(languageCode);
        
        return isRecommendedHost && supportsLanguage;
      })
      .sort((a, b) => {
        // 按优先级排序（数字越小优先级越高）
        const priorityA = a.recommended_priority || 100;
        const priorityB = b.recommended_priority || 100;
        return priorityA - priorityB;
      });
  }

  // 🔧 新增：获取推荐的Guest personas
  function getRecommendedGuests(languageCode: string): Persona[] {
    if (!languageCode) return [];
    
    return personasCache.value
      .filter(persona => {
        // 检查是否推荐为Guest且支持该语言
        const isRecommendedGuest = persona.is_recommended_guest === true;
        const supportsLanguage = persona.language_support && 
          Array.isArray(persona.language_support) && 
          persona.language_support.includes(languageCode);
        
        return isRecommendedGuest && supportsLanguage;
      })
      .sort((a, b) => {
        // 按优先级排序（数字越小优先级越高）
        const priorityA = a.recommended_priority || 100;
        const priorityB = b.recommended_priority || 100;
        return priorityA - priorityB;
      });
  }

  // 🔧 新增：获取首个推荐的Host（用于fallback）
  function getFirstRecommendedHost(languageCode: string): Persona | undefined {
    const recommendedHosts = getRecommendedHosts(languageCode);
    return recommendedHosts.length > 0 ? recommendedHosts[0] : undefined;
  }

  // 🔧 新增：获取首个推荐的Guest（用于fallback）
  function getFirstRecommendedGuest(languageCode: string): Persona | undefined {
    const recommendedGuests = getRecommendedGuests(languageCode);
    return recommendedGuests.length > 0 ? recommendedGuests[0] : undefined;
  }

  // 🔧 新增：获取默认Host名称（用于脚本生成时的fallback）
  function getDefaultHostName(languageCode: string): string {
    const recommendedHost = getFirstRecommendedHost(languageCode);
    if (recommendedHost) {
      return recommendedHost.name;
    }
    
    // 如果没有推荐的Host，使用语言基础的fallback
    const langCode = languageCode.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    return langCode === 'zh' ? '主持人' : 'Smith';
  }

  // 🔧 新增：获取默认Guest名称（用于脚本生成时的fallback）
  function getDefaultGuestName(languageCode: string): string {
    const recommendedGuest = getFirstRecommendedGuest(languageCode);
    if (recommendedGuest) {
      return recommendedGuest.name;
    }
    
    // 如果没有推荐的Guest，使用语言基础的fallback
    const langCode = languageCode.toLowerCase().startsWith('zh') ? 'zh' : 'en';
    return langCode === 'zh' ? '嘉宾' : 'Guest';
  }

  return {
    personas: computed(() => personasCache.value),
    isLoading: computed(() => isLoading.value),
    fetchPersonas,
    getPersonaById,
    getPersonaByName,
    invalidateCache,
    isCacheStale,
    // 新增的语言过滤功能
    getPersonasByLanguage,
    getRandomPersonaByLanguage,
    getSupportedLanguages,
    // 新增的推荐功能
    getRecommendedHosts,
    getRecommendedGuests,
    getFirstRecommendedHost,
    getFirstRecommendedGuest,
    getDefaultHostName,
    getDefaultGuestName
  };
} 