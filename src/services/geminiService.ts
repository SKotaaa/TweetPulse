export interface SentimentAnalysisResponse {
  sentiment: 'positive' | 'negative' | 'neutral';
  summary: string;
  confidence: number;
  stats: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topics: string[];
}

export const analyzeSentiment = async (keyword: string): Promise<SentimentAnalysisResponse> => {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keyword }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Sentiment Analysis Error:', error);
    throw new Error(error.message || 'Failed to analyze sentiment');
  }
};
