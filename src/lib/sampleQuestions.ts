import { ExamPaper } from "../types";

export const SAMPLE_EXAM_PAPERS: ExamPaper[] = [
  {
    id: "paper_stem_math",
    code: "MATH-402",
    title: "Advanced Applied Mathematics & Mechanics",
    subject: "Mathematics",
    totalMinutes: 60,
    totalMarks: 50,
    instructions: [
      "This is a hands-free accessible examination. Speak clearly into your microphone.",
      "For mathematical formulas, say 'math mode [formula]' (e.g. 'math mode fraction of x squared over two plus five equals zero').",
      "For diagrams or geometric figures, say 'draw [shape]' (e.g. 'draw coordinate axes', 'draw circle radius 60').",
      "You can ask 'time remaining' or 'read question' at any moment without penalty.",
      "All actions, edits, and timestamps are recorded in your tamper-evident audit log.",
    ],
    questions: [
      {
        id: "m402_q1",
        number: 1,
        section: "Section A: Conceptual Foundation",
        type: "mcq",
        prompt:
          "Which of the following represents the derivative of f(x) = ln(3x^2 + 1) with respect to x?",
        marks: 5,
        options: [
          { key: "A", text: "f'(x) = 6x / (3x^2 + 1)" },
          { key: "B", text: "f'(x) = 1 / (3x^2 + 1)" },
          { key: "C", text: "f'(x) = 3x / (3x^2 + 1)" },
          { key: "D", text: "f'(x) = 6x * ln(3x^2 + 1)" },
        ],
        hint: "Say 'select option A', 'select option B', etc.",
      },
      {
        id: "m402_q2",
        number: 2,
        section: "Section B: Calculus & Derivation",
        type: "math",
        prompt:
          "Evaluate the definite integral of (3x^2 - 4x + 7) with respect to x from x = 0 to x = 3. Show all intermediary steps using mathematical formulas.",
        marks: 10,
        wordLimit: 150,
        mathTemplate: "\\int_{0}^{3} (3x^2 - 4x + 7) \\, dx",
        hint: "Say 'math mode integral of 3 x squared minus 4 x plus 7 d x from 0 to 3'",
      },
      {
        id: "m402_q3",
        number: 3,
        section: "Section C: Geometric Representation",
        type: "diagram",
        prompt:
          "Draw a free-body diagram showing a block on a horizontal surface subjected to an applied force pointing right, a frictional resistance pointing left, and normal force pointing upwards. Label each vector arrow.",
        marks: 15,
        diagramInitialPrompt: "Say 'draw rectangle width 120 height 80 at center', then 'draw arrow from left to right', 'label diagram Applied Force'",
        hint: "Say 'draw rectangle', 'draw arrow from left to right', 'label Normal Force'",
      },
      {
        id: "m402_q4",
        number: 4,
        section: "Section D: Long Analytical Problem",
        type: "long_answer",
        prompt:
          "Explain the Fundamental Theorem of Calculus. Structure your answer with an Introduction, a statement of Part 1 and Part 2, a practical physical example (such as velocity and displacement), and a Conclusion.",
        marks: 20,
        wordLimit: 300,
        hint: "Say 'insert introduction', then dictate your points. Use 'bullet point' to structure Parts 1 & 2, then 'insert conclusion'.",
      },
    ],
  },
  {
    id: "paper_cs_data_structures",
    code: "CS-301",
    title: "Algorithms, Data Structures & System Ethics",
    subject: "Computer Science",
    totalMinutes: 45,
    totalMarks: 40,
    instructions: [
      "Voice navigation is active: say 'next question' or 'go to question 2'.",
      "You may structure code or long responses using 'new line' or 'new paragraph'.",
      "Diagram canvas supports tree structures and flowchart shapes.",
      "Extra time accommodations are automatically added to your session timer.",
    ],
    questions: [
      {
        id: "cs301_q1",
        number: 1,
        section: "Section A: Complexity Analysis",
        type: "mcq",
        prompt:
          "What is the average-case and worst-case time complexity of searching in a Balanced Binary Search Tree (such as an AVL or Red-Black tree)?",
        marks: 5,
        options: [
          { key: "A", text: "Average: O(1), Worst: O(n)" },
          { key: "B", text: "Average: O(log n), Worst: O(log n)" },
          { key: "C", text: "Average: O(n), Worst: O(n log n)" },
          { key: "D", text: "Average: O(log n), Worst: O(n)" },
        ],
      },
      {
        id: "cs301_q2",
        number: 2,
        section: "Section B: Algorithm Synthesis",
        type: "short_answer",
        prompt:
          "Describe how Dijkstra's algorithm determines the shortest path from a single source node in a weighted graph with non-negative edge weights. Mention the primary data structure used for optimization.",
        marks: 10,
        wordLimit: 150,
      },
      {
        id: "cs301_q3",
        number: 3,
        section: "Section C: Architectural Diagram",
        type: "diagram",
        prompt:
          "Sketch a binary tree structure with a root node labeled 'Root' and two child nodes labeled 'L' and 'R'. Use circles for nodes and arrows or lines connecting them.",
        marks: 10,
        diagramInitialPrompt: "Say 'draw circle radius 40 at top labeled Root', 'draw circle radius 35 at bottom left labeled L'",
      },
      {
        id: "cs301_q4",
        number: 4,
        section: "Section D: Ethical Computing Essay",
        type: "long_answer",
        prompt:
          "Discuss the ethical implications of automated algorithmic decision-making in public services (e.g. loan approvals, judicial sentencing). Structure your argument with clear paragraphs, identifying at least two algorithmic biases and propose concrete mitigation strategies.",
        marks: 15,
        wordLimit: 350,
      },
    ],
  },
  {
    id: "paper_general_science",
    code: "SCI-101",
    title: "General Science, Cellular Biology & Photosynthesis",
    subject: "Biology",
    totalMinutes: 30,
    totalMarks: 30,
    instructions: [
      "Say 'read question' to have the computer read any question aloud.",
      "Say 'math mode' for chemical balance equations (e.g. '6 CO2 plus 6 H2O gives C6H12O6').",
      "Diagram drawing supports cell organelles and flow arrows.",
    ],
    questions: [
      {
        id: "sci101_q1",
        number: 1,
        section: "Section A: Cellular Structures",
        type: "short_answer",
        prompt:
          "State the primary function of the mitochondrion in eukaryotic cells and describe how ATP is produced along the inner cristae.",
        marks: 10,
        wordLimit: 120,
      },
      {
        id: "sci101_q2",
        number: 2,
        section: "Section B: Biochemical Reaction",
        type: "math",
        prompt:
          "Provide the balanced chemical equation for aerobic cellular respiration, showing glucose reacting with oxygen to produce carbon dioxide, water, and ATP energy.",
        marks: 10,
        mathTemplate: "C_6H_{12}O_6 + 6O_2 \\to 6CO_2 + 6H_2O + \\text{ATP}",
      },
      {
        id: "sci101_q3",
        number: 3,
        section: "Section C: Cell Diagram",
        type: "diagram",
        prompt:
          "Draw a simplified cell membrane: draw an outer circle or rectangle representing the cell wall, an inner circle for the nucleus labeled 'Nucleus', and an arrow indicating nutrient transport.",
        marks: 10,
      },
    ],
  },
];

export const DEFAULT_EXAM_PAPER: ExamPaper = SAMPLE_EXAM_PAPERS[0];
