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

  // ── Plan sub-schemas (OPT-1: split plan prompt) ───────────────────────────

  PLAN_MODULES: {
    type: SchemaType.OBJECT,
    properties: {
      topic: { type: SchemaType.STRING },
      key_concepts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      duration_weeks: { type: SchemaType.NUMBER },
      modules: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            goal: { type: SchemaType.STRING },
            lessons: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  objective: { type: SchemaType.STRING },
                  study_time_min: { type: SchemaType.NUMBER },
                  activities: {
                    type: SchemaType.ARRAY,
                    items: {
                      type: SchemaType.OBJECT,
                      properties: {
                        type: { type: SchemaType.STRING },
                        prompt: { type: SchemaType.STRING },
                        expected_outcome: { type: SchemaType.STRING },
                      },
                      required: ["type", "prompt"],
                    },
                  },
                  mini_quiz: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                },
                required: ["title", "objective"],
              },
            },
          },
          required: ["title", "goal", "lessons"],
        },
      },
      resources: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      seed_quiz: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    },
    required: ["topic", "modules"],
  },

  PLAN_EMPHASES: {
    type: SchemaType.OBJECT,
    properties: {
      emphases: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            statement: { type: SchemaType.STRING },
            why: { type: SchemaType.STRING },
            in_slides: { type: SchemaType.BOOLEAN },
            evidence: { type: SchemaType.STRING },
            source: { type: SchemaType.STRING },
            from_transcript_quote: { type: SchemaType.STRING },
            from_slide_quote: { type: SchemaType.STRING },
            related_lo_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ["statement", "why"],
        },
      },
    },
    required: ["emphases"],
  },

  PLAN_ALIGNMENT: {
    type: SchemaType.OBJECT,
    properties: {
      alignment: {
        type: SchemaType.OBJECT,
        properties: {
          summary_chatty: { type: SchemaType.STRING },
          average_duration_min: { type: SchemaType.NUMBER },
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                topic: { type: SchemaType.STRING },
                concepts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                in_both: { type: SchemaType.BOOLEAN },
                emphasis_level: { type: SchemaType.STRING },
                lecture_quotes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                slide_refs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                duration_min: { type: SchemaType.NUMBER },
                confidence: { type: SchemaType.NUMBER },
              },
              required: ["topic", "concepts", "in_both"],
            },
          },
        },
        required: ["items"],
      },
    },
    required: ["alignment"],
  },

  // ── Additional structured output schemas (OPT-2) ──────────────────────────

  CHEAT_SHEET: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING },
      updatedAt: { type: SchemaType.STRING },
      sections: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            heading: { type: SchemaType.STRING },
            bullets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ["heading", "bullets"],
        },
      },
      formulas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      pitfalls: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      quickQuiz: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            q: { type: SchemaType.STRING },
            a: { type: SchemaType.STRING },
          },
          required: ["q", "a"],
        },
      },
    },
    required: ["title", "sections"],
  },

  LO_ALIGNMENT: {
    type: SchemaType.OBJECT,
    properties: {
      segments: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            index: { type: SchemaType.NUMBER },
            lo_links: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  lo_id: { type: SchemaType.STRING },
                  lo_title: { type: SchemaType.STRING },
                  confidence: { type: SchemaType.NUMBER },
                },
                required: ["lo_id", "lo_title", "confidence"],
              },
            },
          },
          required: ["index", "lo_links"],
        },
      },
    },
    required: ["segments"],
  },

  LO_MODULES: {
    type: SchemaType.OBJECT,
    properties: {
      modules: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            loId: { type: SchemaType.STRING },
            loTitle: { type: SchemaType.STRING },
            oneLineGist: { type: SchemaType.STRING },
            coreIdeas: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            mustRemember: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            intuitiveExplanation: { type: SchemaType.STRING },
            examples: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  label: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                },
                required: ["label", "description"],
              },
            },
            typicalQuestions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            commonTraps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            miniQuiz: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  question: { type: SchemaType.STRING },
                  answer: { type: SchemaType.STRING },
                  why: { type: SchemaType.STRING },
                },
                required: ["question", "answer"],
              },
            },
            recommended_study_time_min: { type: SchemaType.NUMBER },
          },
          required: ["loId", "loTitle", "oneLineGist"],
        },
      },
    },
    required: ["modules"],
  },

  CHANNEL_QUIZ: {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        question: { type: SchemaType.STRING },
        options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        correctIndex: { type: SchemaType.NUMBER },
        explanation: { type: SchemaType.STRING },
        type: { type: SchemaType.STRING },
        difficulty: { type: SchemaType.STRING },
      },
      required: ["question", "options", "correctIndex", "explanation"],
    },
  },

  CHANNEL_FLASHCARDS: {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        front: { type: SchemaType.STRING },
        back: { type: SchemaType.STRING },
        hint: { type: SchemaType.STRING },
        topic: { type: SchemaType.STRING },
      },
      required: ["front", "back", "topic"],
    },
  },

  // ── Confidence Scoring (OPT-15) ──────────────────────────────────────────

  CONFIDENCE_SCORE: {
    type: SchemaType.OBJECT,
    properties: {
      coverage: { type: SchemaType.NUMBER },
      accuracy: { type: SchemaType.NUMBER },
      completeness: { type: SchemaType.NUMBER },
      flags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    },
    required: ["coverage", "accuracy", "completeness", "flags"],
  },

  // ── Knowledge Graph (OPT-12) ─────────────────────────────────────────────

  KNOWLEDGE_GRAPH: {
    type: SchemaType.OBJECT,
    properties: {
      nodes: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            name: { type: SchemaType.STRING },
            type: { type: SchemaType.STRING },
          },
          required: ["id", "name", "type"],
        },
      },
      edges: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            from: { type: SchemaType.STRING },
            to: { type: SchemaType.STRING },
            relationship: { type: SchemaType.STRING },
            confidence: { type: SchemaType.NUMBER },
            evidence: { type: SchemaType.STRING },
          },
          required: ["from", "to", "relationship", "confidence"],
        },
      },
    },
    required: ["nodes", "edges"],
  },
};
