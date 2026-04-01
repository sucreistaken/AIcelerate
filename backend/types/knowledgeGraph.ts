export interface ConceptNode {
  id: string;            // kebab-case slug
  name: string;          // display name
  type: "concept" | "principle" | "formula" | "technique" | "definition";
  lessonIds: string[];
  strength: number;      // 0-1, how central in the course
}

export interface ConceptEdge {
  from: string;          // node id
  to: string;            // node id
  relationship: "prerequisite" | "extends" | "applies" | "example_of";
  confidence: number;    // 0-1
  evidence?: string;     // brief AI-generated explanation
}

export interface KnowledgeGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  builtAt: string;
  version: number;
}
