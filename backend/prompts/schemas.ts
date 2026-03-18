// prompts/schemas.ts
// Gemini response_schema definitions for structured output.
// Used with responseMimeType: 'application/json' to guarantee valid JSON.

import { SchemaType } from "@google/generative-ai";

export const SCHEMAS = {
  QUIZ_EVAL: {
    type: SchemaType.OBJECT,
    properties: {
      grade: { type: SchemaType.STRING, enum: ["correct", "partial", "incorrect"] },
      feedback: { type: SchemaType.STRING },
      missing_points: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      evidence: {
        type: SchemaType.OBJECT,
        properties: {
          lec: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { quote: { type: SchemaType.STRING } }, required: ["quote"] } },
          slide: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { quote: { type: SchemaType.STRING } }, required: ["quote"] } },
        },
        required: ["lec", "slide"],
      },
      confidence: { type: SchemaType.NUMBER },
    },
    required: ["grade", "feedback", "missing_points", "confidence"],
  },

  QUIZ_EVAL_BATCH: {
    type: SchemaType.OBJECT,
    properties: {
      results: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            index: { type: SchemaType.NUMBER },
            grade: { type: SchemaType.STRING, enum: ["correct", "partial", "incorrect"] },
            feedback: { type: SchemaType.STRING },
            missing_points: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            confidence: { type: SchemaType.NUMBER },
          },
          required: ["index", "grade", "feedback"],
        },
      },
    },
    required: ["results"],
  },

  QUIZ_ANSWERS: {
    type: SchemaType.OBJECT,
    properties: {
      answers: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            q: { type: SchemaType.STRING },
            short_answer: { type: SchemaType.STRING },
            explanation: { type: SchemaType.STRING },
            evidence: {
              type: SchemaType.OBJECT,
              properties: {
                lec: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { quote: { type: SchemaType.STRING } }, required: ["quote"] } },
                slide: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { quote: { type: SchemaType.STRING } }, required: ["quote"] } },
              },
              required: ["lec", "slide"],
            },
            confidence: { type: SchemaType.NUMBER },
          },
          required: ["q", "short_answer", "explanation"],
        },
      },
    },
    required: ["answers"],
  },

  MINDMAP_NODE_ALL: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING },
      explanation: { type: SchemaType.STRING },
      keyPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      relatedConcepts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      example: {
        type: SchemaType.OBJECT,
        properties: {
          scenario: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
          takeaway: { type: SchemaType.STRING },
        },
        required: ["scenario", "explanation", "takeaway"],
      },
      quiz: {
        type: SchemaType.OBJECT,
        properties: {
          question: { type: SchemaType.STRING },
          options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          correctAnswer: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
        },
        required: ["question", "options", "correctAnswer", "explanation"],
      },
    },
    required: ["title", "explanation", "example", "quiz"],
  },

  STUDY_SCHEDULE: {
    type: SchemaType.OBJECT,
    properties: {
      days: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            day: { type: SchemaType.STRING },
            slots: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  time: { type: SchemaType.STRING },
                  activity: { type: SchemaType.STRING },
                },
                required: ["time", "activity"],
              },
            },
          },
          required: ["day", "slots"],
        },
      },
      tips: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    },
    required: ["days", "tips"],
  },

  CONNECTION_INSIGHTS: {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        concept: { type: SchemaType.STRING },
        insight: { type: SchemaType.STRING },
      },
      required: ["concept", "insight"],
    },
  },

  LESSON_DIGEST: {
    type: SchemaType.OBJECT,
    properties: {
      transcriptDigest: { type: SchemaType.STRING },
      slidesDigest: { type: SchemaType.STRING },
      formulasAndDefinitions: { type: SchemaType.STRING },
    },
    required: ["transcriptDigest", "slidesDigest", "formulasAndDefinitions"],
  },
};
