import type { Question } from "../types/game.js";

export const QUESTIONS: Question[] = [
  {
    id: "q001",
    text: "日本で一番高い山は何でしょう？",
    answer: "富士山",
  },
  {
    id: "q002",
    text: "水の化学式は何でしょう？",
    answer: "H2O",
  },
  {
    id: "q003",
    text: "日本の首都はどこでしょう？",
    answer: "東京",
  },
  {
    id: "q004",
    text: "1年のうち、2月の次に来る月は何月でしょう？",
    answer: "3月",
  },
  {
    id: "q005",
    text: "英語で犬を表す単語は何でしょう？",
    answer: "dog",
  },
  {
    id: "q006",
    text: "太陽系で地球のひとつ外側を回る惑星は何でしょう？",
    answer: "火星",
  },
  {
    id: "q007",
    text: "将棋で王将の隣に初期配置される、斜めに進む駒は何でしょう？",
    answer: "金将",
  },
  {
    id: "q008",
    text: "日本の国鳥として知られる鳥は何でしょう？",
    answer: "キジ",
  },
  {
    id: "q009",
    text: "三角形の内角の和は何度でしょう？",
    answer: "180度",
  },
  {
    id: "q010",
    text: "童話『桃太郎』で、桃太郎が鬼退治に向かった島は何と呼ばれるでしょう？",
    answer: "鬼ヶ島",
  },
];

export function selectRandomQuestion(): Question {
  return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
}
