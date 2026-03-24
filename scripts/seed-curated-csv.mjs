import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CSV_HEADERS } from "./import-curated-csv.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT_DIR, "data", "curated-lexicon.csv");

const rows = [];

function addRow(row) {
  rows.push({
    aliases: "",
    weight: 100,
    enabled: true,
    category: "phrase",
    note: "",
    source: "manual",
    status: "approved",
    ...row,
  });
}

function addRows(nextRows) {
  nextRows.forEach(addRow);
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  if (/[",\n\r]/u.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

addRows([
  { mandarin: "你好", shanghainese: "侬好", aliases: "你好啊|您好", weight: 180, category: "greeting", note: "常用问候" },
  { mandarin: "怎么回事", shanghainese: "哪能为实事", aliases: "怎么一回事|怎么回事啊", weight: 195, category: "question", note: "首选示例" },
  { mandarin: "怎么回事", shanghainese: "哪能回事", aliases: "这是怎么回事", weight: 175, category: "question", note: "常见口语短写" },
  { mandarin: "你在做什么", shanghainese: "侬勒做啥", aliases: "你在干什么|你在做啥", weight: 188, category: "question", note: "高频短句" },
  { mandarin: "今天下雨了", shanghainese: "今朝落雨了", aliases: "今天下雨啦|今天下雨", weight: 188, category: "weather", note: "验收样例" },
  { mandarin: "今天下雨了", shanghainese: "今朝下雨了", aliases: "", weight: 168, category: "weather", note: "偏普通话写法" },
  { mandarin: "你好吗", shanghainese: "侬好伐", aliases: "你还好吗|你最近好吗", weight: 176, category: "greeting", note: "固定问候" },
  { mandarin: "谢谢", shanghainese: "谢谢侬", aliases: "谢谢你", weight: 156, category: "courtesy", note: "礼貌表达" },
  { mandarin: "再见", shanghainese: "再会", aliases: "回头见|下次见", weight: 150, category: "courtesy", note: "固定告别" },
  { mandarin: "没关系", shanghainese: "呒没关系", aliases: "没有关系|没啥关系", weight: 152, category: "response", note: "高频回应" },
  { mandarin: "不知道", shanghainese: "勿晓得", aliases: "不晓得", weight: 172, category: "response", note: "高频词组" },
  { mandarin: "不要", shanghainese: "勿要", aliases: "别要", weight: 160, category: "verb", note: "高频否定" },
  { mandarin: "不要", shanghainese: "覅", aliases: "", weight: 145, category: "verb", note: "沪语常见变体" },
  { mandarin: "没有", shanghainese: "呒没", aliases: "没", weight: 158, category: "response", note: "高频否定" },
  { mandarin: "我们", shanghainese: "阿拉", aliases: "", weight: 170, category: "pronoun", note: "常用代词" },
  { mandarin: "你们", shanghainese: "侬伲", aliases: "", weight: 160, category: "pronoun", note: "常用代词" },
  { mandarin: "你", shanghainese: "侬", aliases: "", weight: 165, category: "pronoun", note: "常用代词" },
  { mandarin: "我", shanghainese: "吾", aliases: "", weight: 165, category: "pronoun", note: "常用代词" },
  { mandarin: "他", shanghainese: "伊", aliases: "", weight: 160, category: "pronoun", note: "常用代词" },
  { mandarin: "她", shanghainese: "伊", aliases: "", weight: 160, category: "pronoun", note: "常用代词" },
  { mandarin: "什么", shanghainese: "啥", aliases: "啥子", weight: 166, category: "question", note: "疑问词" },
  { mandarin: "怎么", shanghainese: "哪能", aliases: "", weight: 170, category: "question", note: "疑问词" },
  { mandarin: "为什么", shanghainese: "做啥", aliases: "为何", weight: 160, category: "question", note: "疑问词" },
  { mandarin: "哪里", shanghainese: "阿里", aliases: "哪儿", weight: 155, category: "question", note: "方位词" },
  { mandarin: "这里", shanghainese: "搿搭", aliases: "这儿", weight: 155, category: "position", note: "方位词" },
  { mandarin: "那里", shanghainese: "埃搭", aliases: "那儿", weight: 155, category: "position", note: "方位词" },
  { mandarin: "现在", shanghainese: "现在", aliases: "这会儿", weight: 110, category: "time", note: "通用词保留" },
  { mandarin: "今天", shanghainese: "今朝", aliases: "", weight: 165, category: "time", note: "时间词" },
  { mandarin: "昨天", shanghainese: "昨朝", aliases: "", weight: 148, category: "time", note: "时间词" },
  { mandarin: "明天", shanghainese: "明朝", aliases: "", weight: 148, category: "time", note: "时间词" },
  { mandarin: "下雨", shanghainese: "落雨", aliases: "", weight: 160, category: "weather", note: "天气词" },
  { mandarin: "喜欢", shanghainese: "欢喜", aliases: "", weight: 150, category: "verb", note: "常用动词" },
  { mandarin: "很", shanghainese: "蛮", aliases: "", weight: 140, category: "adverb", note: "程度副词" },
  { mandarin: "很好", shanghainese: "蛮好", aliases: "挺好", weight: 152, category: "response", note: "高频短句" },
  { mandarin: "吃饭", shanghainese: "吃饭", aliases: "", weight: 120, category: "life", note: "通用词" },
  { mandarin: "回家", shanghainese: "转去", aliases: "回去", weight: 142, category: "verb", note: "常用动词" },
  { mandarin: "别客气", shanghainese: "勿要客气", aliases: "不用客气", weight: 150, category: "courtesy", note: "礼貌表达" },
  { mandarin: "请问", shanghainese: "请问", aliases: "", weight: 118, category: "courtesy", note: "通用表达" },
  { mandarin: "身体好吗", shanghainese: "身体好伐", aliases: "身体还好吗", weight: 146, category: "greeting", note: "问候语" },
  { mandarin: "今天很抱歉", shanghainese: "今朝老勿好意思额", aliases: "今天真不好意思", weight: 144, category: "courtesy", note: "情景短句" },
  { mandarin: "我没事儿", shanghainese: "吾呒没关系额", aliases: "我没事|我没关系", weight: 144, category: "response", note: "情景短句" },
  { mandarin: "朋友", shanghainese: "朋友", aliases: "", weight: 116, category: "noun", note: "通用词" },
  { mandarin: "不认识", shanghainese: "勿认得", aliases: "不认得", weight: 148, category: "verb", note: "常用短语" },
  { mandarin: "等了这么长时间", shanghainese: "等了介许多辰光", aliases: "等了这么久", weight: 144, category: "phrase", note: "情景短语" },
  { mandarin: "早上好", shanghainese: "侬早", aliases: "早安", weight: 162, category: "greeting", note: "晨间问候" },
  { mandarin: "晚上好", shanghainese: "夜里好", aliases: "", weight: 138, category: "greeting", note: "晚间问候" },
  { mandarin: "对不起", shanghainese: "对勿起", aliases: "抱歉", weight: 164, category: "courtesy", note: "道歉表达" },
  { mandarin: "不好意思", shanghainese: "勿好意思", aliases: "", weight: 154, category: "courtesy", note: "常用道歉" },
  { mandarin: "没事", shanghainese: "呒没事", aliases: "", weight: 150, category: "response", note: "常用回应" },
  { mandarin: "不要紧", shanghainese: "勿要紧", aliases: "别紧张", weight: 145, category: "response", note: "常用回应" },
  { mandarin: "不行", shanghainese: "伐来塞", aliases: "不可以", weight: 166, category: "response", note: "常用否定" },
  { mandarin: "行", shanghainese: "来塞", aliases: "可以", weight: 145, category: "response", note: "常用肯定" },
  { mandarin: "知道", shanghainese: "晓得", aliases: "", weight: 150, category: "verb", note: "常用动词" },
  { mandarin: "认识", shanghainese: "认得", aliases: "", weight: 145, category: "verb", note: "常用动词" },
  { mandarin: "会说", shanghainese: "讲得来", aliases: "说得来", weight: 145, category: "verb", note: "表达能力" },
  { mandarin: "上海话", shanghainese: "上海言话", aliases: "沪语", weight: 150, category: "noun", note: "方言名称" },
  { mandarin: "说话", shanghainese: "讲话", aliases: "", weight: 130, category: "verb", note: "日常动作" },
  { mandarin: "聊天", shanghainese: "讲闲话", aliases: "", weight: 140, category: "verb", note: "日常动作" },
  { mandarin: "睡觉", shanghainese: "困觉", aliases: "", weight: 158, category: "life", note: "起居表达" },
  { mandarin: "起床", shanghainese: "起身", aliases: "", weight: 140, category: "life", note: "起居表达" },
  { mandarin: "吃饭了吗", shanghainese: "吃过了伐", aliases: "吃过饭了吗", weight: 165, category: "greeting", note: "日常寒暄" },
  { mandarin: "很棒", shanghainese: "老灵额", aliases: "真棒", weight: 158, category: "response", note: "夸赞表达" },
  { mandarin: "厉害", shanghainese: "结棍", aliases: "", weight: 160, category: "response", note: "口语夸赞" },
  { mandarin: "真厉害", shanghainese: "老结棍", aliases: "", weight: 152, category: "response", note: "口语夸赞" },
  { mandarin: "真好", shanghainese: "老好额", aliases: "", weight: 148, category: "response", note: "口语夸赞" },
  { mandarin: "高兴", shanghainese: "开心", aliases: "开心", weight: 132, category: "emotion", note: "情绪表达" },
  { mandarin: "着急", shanghainese: "急", aliases: "", weight: 132, category: "emotion", note: "情绪表达" },
  { mandarin: "别着急", shanghainese: "勿要急", aliases: "别急", weight: 150, category: "response", note: "安慰表达" },
  { mandarin: "慢一点", shanghainese: "慢眼", aliases: "慢点", weight: 140, category: "response", note: "节奏表达" },
  { mandarin: "一起", shanghainese: "一道", aliases: "一块", weight: 145, category: "phrase", note: "共同动作" },
  { mandarin: "一起去", shanghainese: "一道去", aliases: "", weight: 145, category: "phrase", note: "共同动作" },
  { mandarin: "玩", shanghainese: "白相", aliases: "", weight: 150, category: "verb", note: "口语表达" },
  { mandarin: "去玩", shanghainese: "去白相", aliases: "", weight: 145, category: "phrase", note: "口语表达" },
  { mandarin: "帮忙", shanghainese: "帮忙", aliases: "", weight: 125, category: "verb", note: "通用词" },
  { mandarin: "帮帮忙", shanghainese: "帮帮忙", aliases: "", weight: 135, category: "phrase", note: "请求表达" },
  { mandarin: "开玩笑", shanghainese: "寻开心", aliases: "", weight: 145, category: "phrase", note: "口语表达" },
  { mandarin: "胡说", shanghainese: "瞎讲", aliases: "", weight: 145, category: "response", note: "口语表达" },
  { mandarin: "别胡说", shanghainese: "勿要瞎讲", aliases: "", weight: 150, category: "response", note: "口语表达" },
  { mandarin: "真的吗", shanghainese: "真个伐", aliases: "真的吗？", weight: 150, category: "question", note: "确认表达" },
  { mandarin: "当然", shanghainese: "当然", aliases: "", weight: 120, category: "response", note: "通用词" },
  { mandarin: "马上", shanghainese: "马上", aliases: "", weight: 118, category: "time", note: "通用词" },
  { mandarin: "等一下", shanghainese: "等一歇", aliases: "等一会儿|稍等一下", weight: 150, category: "time", note: "时间表达" },
  { mandarin: "一会儿", shanghainese: "一歇", aliases: "一会", weight: 145, category: "time", note: "时间表达" },
  { mandarin: "怎么了", shanghainese: "哪能了", aliases: "怎么啦", weight: 155, category: "question", note: "高频短句" },
  { mandarin: "怎么办", shanghainese: "哪能办", aliases: "", weight: 150, category: "question", note: "高频短句" },
  { mandarin: "什么事", shanghainese: "啥事体", aliases: "什么事情", weight: 150, category: "question", note: "高频短句" },
  { mandarin: "没什么事", shanghainese: "呒没啥事体", aliases: "没啥事", weight: 145, category: "response", note: "常用回应" },
  { mandarin: "有事情", shanghainese: "有事体", aliases: "有事", weight: 135, category: "phrase", note: "常用表达" },
  { mandarin: "上班", shanghainese: "做生活", aliases: "工作", weight: 142, category: "life", note: "常用表达" },
  { mandarin: "下班", shanghainese: "收工", aliases: "", weight: 140, category: "life", note: "常用表达" },
  { mandarin: "回来了", shanghainese: "转来了", aliases: "", weight: 140, category: "phrase", note: "状态表达" },
  { mandarin: "在家", shanghainese: "勒屋里", aliases: "", weight: 145, category: "position", note: "位置表达" },
  { mandarin: "到家了", shanghainese: "到屋里了", aliases: "回到家了", weight: 145, category: "phrase", note: "位置表达" },
  { mandarin: "外面", shanghainese: "外头", aliases: "", weight: 132, category: "position", note: "位置表达" },
  { mandarin: "里面", shanghainese: "里向", aliases: "", weight: 132, category: "position", note: "位置表达" },
  { mandarin: "这边", shanghainese: "搿边", aliases: "", weight: 135, category: "position", note: "位置表达" },
  { mandarin: "那边", shanghainese: "埃边", aliases: "", weight: 135, category: "position", note: "位置表达" },
  { mandarin: "时间", shanghainese: "辰光", aliases: "", weight: 138, category: "time", note: "常用名词" },
  { mandarin: "一点点", shanghainese: "一眼眼", aliases: "", weight: 132, category: "phrase", note: "数量表达" },
  { mandarin: "全部", shanghainese: "侪", aliases: "都", weight: 136, category: "phrase", note: "数量表达" },
  { mandarin: "谁", shanghainese: "啥人", aliases: "谁啊", weight: 145, category: "question", note: "疑问词" },
  { mandarin: "多少", shanghainese: "几许", aliases: "", weight: 145, category: "question", note: "疑问词" },
  { mandarin: "很多", shanghainese: "老多", aliases: "", weight: 140, category: "quantity", note: "数量表达" },
  { mandarin: "太多了", shanghainese: "忒多了", aliases: "", weight: 140, category: "quantity", note: "数量表达" },
  { mandarin: "还没有", shanghainese: "还呒没", aliases: "", weight: 145, category: "response", note: "状态表达" },
  { mandarin: "已经", shanghainese: "已经", aliases: "", weight: 118, category: "time", note: "通用词" },
  { mandarin: "真的", shanghainese: "真个", aliases: "", weight: 138, category: "response", note: "口语表达" },
  { mandarin: "可能", shanghainese: "可能", aliases: "", weight: 118, category: "response", note: "通用词" },
  { mandarin: "不一定", shanghainese: "勿一定", aliases: "", weight: 140, category: "response", note: "常用回应" },
  { mandarin: "小心", shanghainese: "当心", aliases: "", weight: 138, category: "response", note: "提醒表达" },
  { mandarin: "别担心", shanghainese: "勿要担心", aliases: "不要担心", weight: 145, category: "response", note: "安慰表达" },
  { mandarin: "热", shanghainese: "热", aliases: "", weight: 118, category: "weather", note: "通用词" },
  { mandarin: "冷", shanghainese: "冷", aliases: "", weight: 118, category: "weather", note: "通用词" },
  { mandarin: "太热了", shanghainese: "忒热了", aliases: "", weight: 140, category: "weather", note: "天气表达" },
  { mandarin: "太冷了", shanghainese: "忒冷了", aliases: "", weight: 140, category: "weather", note: "天气表达" },
  { mandarin: "今天很热", shanghainese: "今朝蛮热", aliases: "", weight: 145, category: "weather", note: "天气表达" },
  { mandarin: "今天很冷", shanghainese: "今朝蛮冷", aliases: "", weight: 145, category: "weather", note: "天气表达" },
  { mandarin: "下雨了", shanghainese: "落雨了", aliases: "", weight: 145, category: "weather", note: "天气表达" },
  { mandarin: "雨很大", shanghainese: "雨老大", aliases: "", weight: 138, category: "weather", note: "天气表达" },
  { mandarin: "风很大", shanghainese: "风老大", aliases: "", weight: 138, category: "weather", note: "天气表达" },
  { mandarin: "出太阳了", shanghainese: "出日头了", aliases: "", weight: 145, category: "weather", note: "天气表达" },
  { mandarin: "天气很好", shanghainese: "天气蛮好", aliases: "", weight: 140, category: "weather", note: "天气表达" },
  { mandarin: "明天下雨", shanghainese: "明朝落雨", aliases: "", weight: 145, category: "weather", note: "天气表达" },
  { mandarin: "昨天下雨了", shanghainese: "昨朝落雨了", aliases: "", weight: 145, category: "weather", note: "天气表达" },
  { mandarin: "明天见", shanghainese: "明朝再会", aliases: "明天再见", weight: 150, category: "courtesy", note: "告别表达" },
  { mandarin: "回头见", shanghainese: "回头再会", aliases: "", weight: 145, category: "courtesy", note: "告别表达" },
  { mandarin: "好久不见", shanghainese: "老久勿见", aliases: "", weight: 150, category: "greeting", note: "重逢问候" },
  { mandarin: "没听懂", shanghainese: "勿曾听懂", aliases: "没有听懂", weight: 145, category: "response", note: "理解表达" },
  { mandarin: "听不懂", shanghainese: "听勿懂", aliases: "", weight: 145, category: "response", note: "理解表达" },
  { mandarin: "看不懂", shanghainese: "看勿懂", aliases: "", weight: 145, category: "response", note: "理解表达" },
  { mandarin: "学不会", shanghainese: "学勿会", aliases: "", weight: 145, category: "response", note: "能力表达" },
  { mandarin: "记不住", shanghainese: "记勿牢", aliases: "", weight: 145, category: "response", note: "记忆表达" },
  { mandarin: "想不起来", shanghainese: "想勿起来", aliases: "", weight: 145, category: "response", note: "记忆表达" },
  { mandarin: "没办法", shanghainese: "呒没办法", aliases: "没有办法", weight: 150, category: "response", note: "常用回应" },
  { mandarin: "别这样", shanghainese: "勿要介样", aliases: "不要这样", weight: 145, category: "response", note: "常用回应" },
  { mandarin: "就这样", shanghainese: "就介样", aliases: "", weight: 138, category: "response", note: "常用回应" },
  { mandarin: "这么多", shanghainese: "介许多", aliases: "", weight: 140, category: "quantity", note: "数量表达" },
  { mandarin: "这么久", shanghainese: "介许久", aliases: "", weight: 140, category: "time", note: "时间表达" },
  { mandarin: "今天很忙", shanghainese: "今朝老忙", aliases: "", weight: 142, category: "life", note: "状态表达" },
  { mandarin: "你没事吧", shanghainese: "侬呒没事伐", aliases: "", weight: 148, category: "greeting", note: "关心表达" },
  { mandarin: "没问题", shanghainese: "呒没问题", aliases: "", weight: 140, category: "response", note: "常用回应" },
  { mandarin: "别说了", shanghainese: "勿要讲了", aliases: "不要说了", weight: 145, category: "response", note: "制止表达" },
  { mandarin: "别问了", shanghainese: "勿要问了", aliases: "不要问了", weight: 145, category: "response", note: "制止表达" },
  { mandarin: "不用谢", shanghainese: "勿用谢", aliases: "不用谢谢", weight: 145, category: "courtesy", note: "礼貌表达" },
  { mandarin: "不客气", shanghainese: "勿要客气", aliases: "", weight: 145, category: "courtesy", note: "礼貌表达" },
  { mandarin: "请坐", shanghainese: "请坐", aliases: "", weight: 120, category: "courtesy", note: "通用表达" },
  { mandarin: "请进", shanghainese: "请进", aliases: "", weight: 120, category: "courtesy", note: "通用表达" },
  { mandarin: "好的", shanghainese: "好额", aliases: "好", weight: 145, category: "response", note: "常用回应" },
  { mandarin: "好吧", shanghainese: "好伐", aliases: "", weight: 140, category: "response", note: "常用回应" },
  { mandarin: "算了", shanghainese: "算了", aliases: "", weight: 125, category: "response", note: "通用表达" },
  { mandarin: "太好了", shanghainese: "忒好了", aliases: "", weight: 145, category: "response", note: "夸赞表达" },
  { mandarin: "真开心", shanghainese: "老开心", aliases: "", weight: 140, category: "emotion", note: "情绪表达" }
]);

const pronouns = [
  { mandarin: "我", shanghainese: "吾", category: "pronoun" },
  { mandarin: "你", shanghainese: "侬", category: "pronoun" },
  { mandarin: "他", shanghainese: "伊", category: "pronoun" },
  { mandarin: "她", shanghainese: "伊", category: "pronoun" },
  { mandarin: "我们", shanghainese: "阿拉", category: "pronoun" },
  { mandarin: "你们", shanghainese: "侬伲", category: "pronoun" },
];

const predicateTemplates = [
  { mandarin: "很好", shanghainese: "蛮好", weight: 150, category: "response" },
  { mandarin: "不知道", shanghainese: "勿晓得", weight: 165, category: "response" },
  { mandarin: "不要", shanghainese: "勿要", weight: 155, category: "verb" },
  { mandarin: "没有", shanghainese: "呒没", weight: 152, category: "response" },
  { mandarin: "喜欢", shanghainese: "欢喜", weight: 150, category: "verb" },
  { mandarin: "回家", shanghainese: "转去", weight: 145, category: "verb" },
  { mandarin: "不认识", shanghainese: "勿认得", weight: 150, category: "verb" },
  { mandarin: "没关系", shanghainese: "呒没关系", weight: 148, category: "response" },
  { mandarin: "很忙", shanghainese: "老忙", weight: 140, category: "life" },
  { mandarin: "很开心", shanghainese: "老开心", weight: 140, category: "emotion" },
  { mandarin: "在家", shanghainese: "勒屋里", weight: 140, category: "position" },
  { mandarin: "在这里", shanghainese: "勒搿搭", weight: 140, category: "position" },
  { mandarin: "在那里", shanghainese: "勒埃搭", weight: 140, category: "position" },
];

for (const pronoun of pronouns) {
  for (const predicate of predicateTemplates) {
    addRow({
      mandarin: `${pronoun.mandarin}${predicate.mandarin}`,
      shanghainese: `${pronoun.shanghainese}${predicate.shanghainese}`,
      weight: predicate.weight,
      category: predicate.category,
      note: "组合高频短句",
    });
  }
}

const objectTemplates = [
  { mandarin: "上海话", shanghainese: "上海言话", weight: 145, category: "phrase" },
  { mandarin: "朋友", shanghainese: "朋友", weight: 118, category: "phrase" },
  { mandarin: "今天下雨了", shanghainese: "今朝落雨了", weight: 160, category: "weather" },
  { mandarin: "今天很忙", shanghainese: "今朝老忙", weight: 145, category: "life" },
  { mandarin: "今天很好", shanghainese: "今朝蛮好", weight: 145, category: "response" },
  { mandarin: "明天回家", shanghainese: "明朝转去", weight: 145, category: "phrase" },
  { mandarin: "昨天回家了", shanghainese: "昨朝转去了", weight: 145, category: "phrase" },
  { mandarin: "今天回家", shanghainese: "今朝转去", weight: 145, category: "phrase" },
  { mandarin: "明天下雨", shanghainese: "明朝落雨", weight: 145, category: "weather" },
  { mandarin: "今天很热", shanghainese: "今朝蛮热", weight: 145, category: "weather" },
];

for (const pronoun of pronouns) {
  for (const object of objectTemplates) {
    addRow({
      mandarin: `${pronoun.mandarin}${object.mandarin}`,
      shanghainese: `${pronoun.shanghainese}${object.shanghainese}`,
      weight: object.weight,
      category: object.category,
      note: "主语+情景短句",
    });
  }
}

addRows([
  { mandarin: "你喜欢什么", shanghainese: "侬欢喜啥", aliases: "你喜欢啥", weight: 162, category: "question", note: "高频问句" },
  { mandarin: "你为什么这样", shanghainese: "侬做啥介样", aliases: "", weight: 158, category: "question", note: "高频问句" },
  { mandarin: "你怎么了", shanghainese: "侬哪能了", aliases: "", weight: 160, category: "question", note: "高频问句" },
  { mandarin: "你在哪里", shanghainese: "侬勒阿里", aliases: "你在哪儿", weight: 158, category: "question", note: "高频问句" },
  { mandarin: "你去哪里", shanghainese: "侬去阿里", aliases: "", weight: 156, category: "question", note: "高频问句" },
  { mandarin: "你回家吗", shanghainese: "侬转去伐", aliases: "", weight: 156, category: "question", note: "高频问句" },
  { mandarin: "你知道吗", shanghainese: "侬晓得伐", aliases: "", weight: 160, category: "question", note: "高频问句" },
  { mandarin: "你会说上海话吗", shanghainese: "侬上海言话讲得来伐", aliases: "", weight: 180, category: "question", note: "公开源高频句" },
  { mandarin: "你最近好吗", shanghainese: "侬近来好伐", aliases: "", weight: 158, category: "greeting", note: "高频问候" },
  { mandarin: "你今天好吗", shanghainese: "侬今朝好伐", aliases: "", weight: 158, category: "greeting", note: "高频问候" },
  { mandarin: "你今天忙吗", shanghainese: "侬今朝忙伐", aliases: "", weight: 150, category: "question", note: "高频问句" },
  { mandarin: "你今天回家吗", shanghainese: "侬今朝转去伐", aliases: "", weight: 150, category: "question", note: "高频问句" },
  { mandarin: "你明天来吗", shanghainese: "侬明朝来伐", aliases: "", weight: 148, category: "question", note: "高频问句" },
  { mandarin: "你昨天去哪里了", shanghainese: "侬昨朝去阿里了", aliases: "", weight: 148, category: "question", note: "高频问句" },
  { mandarin: "你吃饭了吗", shanghainese: "侬吃过了伐", aliases: "你吃过饭了吗", weight: 166, category: "greeting", note: "高频寒暄" },
  { mandarin: "你吃过了吗", shanghainese: "侬吃过了伐", aliases: "", weight: 164, category: "greeting", note: "高频寒暄" },
  { mandarin: "你在家吗", shanghainese: "侬勒屋里伐", aliases: "", weight: 150, category: "question", note: "高频问句" },
  { mandarin: "你忙吗", shanghainese: "侬忙伐", aliases: "", weight: 148, category: "question", note: "高频问句" },
  { mandarin: "你想什么", shanghainese: "侬想啥", aliases: "", weight: 145, category: "question", note: "高频问句" },
  { mandarin: "你要什么", shanghainese: "侬要啥", aliases: "", weight: 145, category: "question", note: "高频问句" },
  { mandarin: "我们一起去", shanghainese: "阿拉一道去", aliases: "我们一块去", weight: 160, category: "phrase", note: "共同动作" },
  { mandarin: "我们去玩", shanghainese: "阿拉去白相", aliases: "", weight: 156, category: "phrase", note: "共同动作" },
  { mandarin: "我们回家吧", shanghainese: "阿拉转去伐", aliases: "", weight: 154, category: "phrase", note: "共同动作" },
  { mandarin: "我们明天见", shanghainese: "阿拉明朝再会", aliases: "", weight: 152, category: "courtesy", note: "共同动作" },
  { mandarin: "我们现在走吧", shanghainese: "阿拉现在走伐", aliases: "", weight: 148, category: "phrase", note: "共同动作" },
  { mandarin: "你们好", shanghainese: "侬伲好", aliases: "", weight: 156, category: "greeting", note: "群体问候" },
  { mandarin: "你们好吗", shanghainese: "侬伲好伐", aliases: "", weight: 156, category: "greeting", note: "群体问候" },
  { mandarin: "你们今天回家吗", shanghainese: "侬伲今朝转去伐", aliases: "", weight: 148, category: "question", note: "群体问句" },
  { mandarin: "你们知道吗", shanghainese: "侬伲晓得伐", aliases: "", weight: 148, category: "question", note: "群体问句" },
  { mandarin: "他很好", shanghainese: "伊蛮好", aliases: "", weight: 150, category: "response", note: "状态表达" },
  { mandarin: "她很好", shanghainese: "伊蛮好", aliases: "", weight: 150, category: "response", note: "状态表达" },
  { mandarin: "他不知道", shanghainese: "伊勿晓得", aliases: "", weight: 152, category: "response", note: "状态表达" },
  { mandarin: "她不知道", shanghainese: "伊勿晓得", aliases: "", weight: 152, category: "response", note: "状态表达" },
  { mandarin: "他回家了", shanghainese: "伊转去了", aliases: "", weight: 148, category: "phrase", note: "状态表达" },
  { mandarin: "她回家了", shanghainese: "伊转去了", aliases: "", weight: 148, category: "phrase", note: "状态表达" },
  { mandarin: "今天怎么这么冷", shanghainese: "今朝哪能介冷", aliases: "", weight: 152, category: "weather", note: "天气问句" },
  { mandarin: "今天怎么这么热", shanghainese: "今朝哪能介热", aliases: "", weight: 152, category: "weather", note: "天气问句" },
  { mandarin: "今天真热", shanghainese: "今朝真热", aliases: "", weight: 142, category: "weather", note: "天气表达" },
  { mandarin: "今天真冷", shanghainese: "今朝真冷", aliases: "", weight: 142, category: "weather", note: "天气表达" },
  { mandarin: "今天天气很好", shanghainese: "今朝天气蛮好", aliases: "", weight: 145, category: "weather", note: "天气表达" },
  { mandarin: "明天天气很好", shanghainese: "明朝天气蛮好", aliases: "", weight: 145, category: "weather", note: "天气表达" },
  { mandarin: "昨天很忙", shanghainese: "昨朝老忙", aliases: "", weight: 140, category: "life", note: "时间表达" },
  { mandarin: "明天很忙", shanghainese: "明朝老忙", aliases: "", weight: 140, category: "life", note: "时间表达" },
  { mandarin: "今天很开心", shanghainese: "今朝老开心", aliases: "", weight: 142, category: "emotion", note: "情绪表达" },
  { mandarin: "昨天很开心", shanghainese: "昨朝老开心", aliases: "", weight: 142, category: "emotion", note: "情绪表达" },
  { mandarin: "明天回家", shanghainese: "明朝转去", aliases: "", weight: 145, category: "phrase", note: "时间表达" },
  { mandarin: "今天回家", shanghainese: "今朝转去", aliases: "", weight: 145, category: "phrase", note: "时间表达" },
  { mandarin: "昨天回家了", shanghainese: "昨朝转去了", aliases: "", weight: 145, category: "phrase", note: "时间表达" },
  { mandarin: "今天出去玩", shanghainese: "今朝出去白相", aliases: "", weight: 145, category: "phrase", note: "生活表达" },
  { mandarin: "我们今天出去玩", shanghainese: "阿拉今朝出去白相", aliases: "", weight: 148, category: "phrase", note: "生活表达" },
  { mandarin: "你今天出去玩", shanghainese: "侬今朝出去白相", aliases: "", weight: 148, category: "phrase", note: "生活表达" },
  { mandarin: "我今天回家", shanghainese: "吾今朝转去", aliases: "", weight: 150, category: "phrase", note: "生活表达" },
  { mandarin: "我明天回家", shanghainese: "吾明朝转去", aliases: "", weight: 150, category: "phrase", note: "生活表达" },
  { mandarin: "我昨天回家了", shanghainese: "吾昨朝转去了", aliases: "", weight: 150, category: "phrase", note: "生活表达" },
  { mandarin: "你今天回家", shanghainese: "侬今朝转去", aliases: "", weight: 150, category: "phrase", note: "生活表达" },
  { mandarin: "你明天回家", shanghainese: "侬明朝转去", aliases: "", weight: 150, category: "phrase", note: "生活表达" },
  { mandarin: "你昨天回家了", shanghainese: "侬昨朝转去了", aliases: "", weight: 150, category: "phrase", note: "生活表达" },
  { mandarin: "我不知道怎么办", shanghainese: "吾勿晓得哪能办", aliases: "", weight: 158, category: "response", note: "高频短句" },
  { mandarin: "你不知道吗", shanghainese: "侬勿晓得伐", aliases: "", weight: 156, category: "question", note: "高频短句" },
  { mandarin: "我不认识他", shanghainese: "吾勿认得伊", aliases: "", weight: 156, category: "phrase", note: "高频短句" },
  { mandarin: "你不认识我吗", shanghainese: "侬勿认得吾伐", aliases: "", weight: 156, category: "question", note: "高频短句" },
  { mandarin: "我们都很好", shanghainese: "阿拉侪蛮好", aliases: "", weight: 152, category: "response", note: "高频短句" },
  { mandarin: "大家都很好", shanghainese: "大家侪蛮好", aliases: "", weight: 148, category: "response", note: "高频短句" },
  { mandarin: "谢谢你们", shanghainese: "谢谢侬伲", aliases: "", weight: 150, category: "courtesy", note: "礼貌表达" },
  { mandarin: "谢谢大家", shanghainese: "谢谢大家", aliases: "", weight: 126, category: "courtesy", note: "礼貌表达" },
  { mandarin: "请你帮忙", shanghainese: "请侬帮忙", aliases: "", weight: 145, category: "courtesy", note: "请求表达" },
  { mandarin: "请帮帮忙", shanghainese: "请帮帮忙", aliases: "", weight: 138, category: "courtesy", note: "请求表达" },
  { mandarin: "帮我一下", shanghainese: "帮吾一歇", aliases: "", weight: 145, category: "courtesy", note: "请求表达" },
  { mandarin: "请等一下", shanghainese: "请等一歇", aliases: "", weight: 145, category: "courtesy", note: "请求表达" },
  { mandarin: "你等一下", shanghainese: "侬等一歇", aliases: "", weight: 145, category: "phrase", note: "请求表达" },
  { mandarin: "我等一下", shanghainese: "吾等一歇", aliases: "", weight: 145, category: "phrase", note: "请求表达" },
  { mandarin: "别着急，我们慢慢来", shanghainese: "勿要急，阿拉慢慢来", aliases: "", weight: 150, category: "response", note: "安慰表达" },
  { mandarin: "别担心，没关系", shanghainese: "勿要担心，呒没关系", aliases: "", weight: 150, category: "response", note: "安慰表达" },
  { mandarin: "真的很好", shanghainese: "真个蛮好", aliases: "", weight: 145, category: "response", note: "高频短句" },
  { mandarin: "真没办法", shanghainese: "真呒没办法", aliases: "", weight: 145, category: "response", note: "高频短句" },
  { mandarin: "就这样吧", shanghainese: "就介样伐", aliases: "", weight: 138, category: "response", note: "高频短句" },
  { mandarin: "先这样吧", shanghainese: "先介样伐", aliases: "", weight: 138, category: "response", note: "高频短句" },
  { mandarin: "我先走了", shanghainese: "吾先走了", aliases: "", weight: 140, category: "courtesy", note: "告别表达" },
  { mandarin: "你先走吧", shanghainese: "侬先走伐", aliases: "", weight: 140, category: "courtesy", note: "告别表达" },
  { mandarin: "我们先走了", shanghainese: "阿拉先走了", aliases: "", weight: 140, category: "courtesy", note: "告别表达" }
]);

const uniqueRows = [];
const seen = new Set();

for (const row of rows) {
  const key = [
    row.mandarin,
    row.shanghainese,
    row.aliases,
    row.category,
    row.status,
  ].join("::");

  if (seen.has(key)) {
    continue;
  }

  seen.add(key);
  uniqueRows.push(row);
}

const csvText = [
  CSV_HEADERS.join(","),
  ...uniqueRows.map((row) => {
    return CSV_HEADERS.map((header) => csvEscape(row[header])).join(",");
  }),
].join("\n");

await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, `${csvText}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      rowCount: uniqueRows.length,
      outputPath: OUTPUT_PATH,
    },
    null,
    2,
  ),
);
