import type { Messages, Segment } from './en';

// Russian UI text; see en.ts for the conventions.
// Addresses the visitor as «вы», which also keeps past-tense verbs free of grammatical gender.

const num = (n: number) => n.toLocaleString('ru');
const rules = new Intl.PluralRules('ru');
/** Pick the word form for n: 1 голос, 2 голоса, 5 голосов. */
const plural = (n: number, one: string, few: string, many: string) =>
  ({ one, few, many })[rules.select(n) as 'one' | 'few' | 'many'] ?? many;
const among = (segment: Segment) =>
  segment === 'designers' ? ' среди дизайнеров' : segment === 'others' ? ' среди не дизайнеров' : '';

export const ru: Messages = {
  brand: 'Poster Vote',
  loading: 'Загрузка',
  yes: 'Да',
  no: 'Нет',
  designerQuestion: 'Вы дизайнер?',

  header: {
    mute: 'Выключить звук',
    unmute: 'Включить звук',
    muteLabel: 'Выключить звук',
    unmuteLabel: 'Включить звук',
    keepVoting: '← Голосовать дальше',
    rankings: 'Рейтинг →',
    setupTitle: 'Почти готово',
    setupBody: ['Добавьте URL Convex в ', ' (или запустите ', ', чтобы всё настроить).']
  },

  menu: {
    label: 'Меню',
    vote: 'Голосование',
    rankings: 'Рейтинг',
    about: 'О проекте',
    settings: 'Настройки',
    past: 'Прошлые конкурсы'
  },

  vote: {
    vaultError: 'Не удалось добраться до хранилища постеров.',
    noPosters: 'Постеров пока нет',
    noPostersBody: ['Положите картинки в ', ' и запустите ', '.'],
    start: 'Начать голосование',
    doneTitle: 'Это были все пары!',
    doneBody: (pairs: number) =>
      `Вы оценили все пары текущих постеров — всего ${num(pairs)}. Возвращайтесь, когда появятся новые.`,
    seeRankings: 'Смотреть рейтинг →',
    votesOnPair: (n: number) => `${num(n)} ${plural(n, 'голос', 'голоса', 'голосов')} в этой паре`,
    voteFor: (title: string) => `Голосовать за «${title}»`,
    yourPick: 'ваш выбор',
    ofVoters: 'голосов',
    skip: 'Не можете выбрать? Пропустить →',
    next: 'Следующая пара →',
    error: 'Голос потерялся среди горошин. Попробуйте следующую пару!',
    verdict: {
      tie: 'Идеальная ничья. Горошины дрожат.',
      unanimous: 'Единогласно. Все согласны.',
      obvious: 'Очевидно. Почти все согласны.',
      streak: (n: number) => `В унисон с большинством — ${num(n)} ${plural(n, 'раз', 'раза', 'раз')} подряд!`,
      crowd: 'Вы на стороне большинства.',
      contrarian: 'Против течения. Легендарно.',
      minority: 'Смелый вкус — вы в меньшинстве.'
    }
  },

  settings: {
    title: 'Настройки',
    designerHint: 'Нужно, чтобы разделить рейтинг. Изменение коснётся только следующих голосов.',
    language: 'Язык',
    yourVotes: 'Ваши голоса',
    counting: 'Считаем…',
    votedBefore: 'Вы проголосовали',
    votedAfter: (n: number) => `${plural(n, 'раз', 'раза', 'раз')}.`,
    clearHint: 'Очистка сотрёт ваш ответ про дизайн, список просмотренных постеров и настройки звука и языка.',
    clear: 'Очистить данные',
    clearConfirm:
      'Стереть всё, что Poster Vote помнит на этом устройстве? Вы начнёте заново как новый участник. Уже отданные голоса останутся в рейтинге.'
  },

  about: {
    title: 'О проекте',
    madeBy: 'Авторы',
    names: 'Алиса Васильева и Джош Томпсон',
    elo: {
      title: 'Как устроен рейтинг',
      body: [
        'Постеры ранжируются по системе Эло — той же, что в шахматах. Каждый постер начинает с 1000 очков, и каждый голос переносит очки от проигравшего к победителю.',
        'Сколько — зависит от соперника: победа над равным постером даёт 16 очков, над фаворитом — до 32, а над аутсайдером — всего несколько.',
        'Поэтому постер, который часто побеждает во многих поединках, может обогнать постер с идеальным счётом всего в паре поединков. Разница в несколько очков — это, по сути, ничья.'
      ],
      more: ['Подробнее о ', 'рейтинге Эло', ' в Википедии.'],
      url: 'https://ru.wikipedia.org/wiki/Рейтинг_Эло'
    }
  },

  results: {
    title: 'Рейтинг',
    heading: ['Общий', 'рейтинг'],
    views: {
      all: 'Все',
      designers: 'Дизайнеры',
      others: 'Не дизайнеры',
      disagree: 'Главные разногласия'
    },
    viewsLabel: 'Чьи голоса показывать',
    archived: 'Архив',
    noCompetitionHere: 'Здесь нет конкурса.',
    noCompetition: 'Пока не идёт ни одного конкурса.',
    disagreeSub: 'Где мнения дизайнеров и всех остальных расходятся.',
    final: (votes: number, segment: Segment) =>
      `Итоги: ${num(votes)} ${plural(votes, 'поединок', 'поединка', 'поединков')}${among(segment)}.`,
    live: (votes: number, segment: Segment) =>
      `В прямом эфире: ${num(votes)} ${plural(votes, 'поединок', 'поединка', 'поединков')}${among(segment)}. ` +
      'Обновляется по ходу голосования.',
    tallying: 'Пересчитываем горошины…',
    seeCurrent: 'Смотреть текущий рейтинг',
    loadError: (message: string) => `Не удалось загрузить результаты: ${message}`,
    notEnough: (min: number, designerVotes: number, otherVotes: number) =>
      `Пока мало данных для сравнения: каждому постеру нужно не меньше ${num(min)} ` +
      `${plural(min, 'поединка', 'поединков', 'поединков')} и от дизайнеров, и от остальных. ` +
      `Сейчас голосов от дизайнеров — ${num(designerVotes)}, от остальных — ${num(otherVotes)}.`,
    versusTitle: 'Дизайнеры против всех остальных',
    versusNote: 'Как часто каждый постер побеждает в каждой группе. Сначала самые большие расхождения.',
    designers: 'Дизайнеры',
    others: 'Остальные',
    gap: (points: number) => `${num(points)} п. п.`,
    designersLove: 'дизайнерам нравится',
    designersNotSold: 'дизайнеров не убедил',
    stats: {
      votes: 'Голосов',
      voters: 'Участников',
      posters: 'Постеров',
      today: 'Голосов за сутки',
      explored: 'Изучено пар'
    },
    noVotesArchived: (segment: Segment) => `Голосов${among(segment)} не было.`,
    noVotesYet: ['Голосов пока нет — ', 'отдайте первый', '.'],
    noVotesSegment: (segment: Segment) => `Голосов${among(segment)} пока нет.`,
    topThree: 'Тройка лидеров',
    podium: (rating: number, winRate: string) =>
      `${num(rating)} ${plural(rating, 'очко', 'очка', 'очков')} · ${winRate} побед`,
    closest: 'Самое упорное соперничество',
    closestBlurb: 'Ноздря в ноздрю',
    lopsided: 'Самый разгромный счёт',
    lopsidedBlurb: 'Без шансов',
    vs: 'vs',
    everyPoster: 'Все постеры',
    detail: {
      close: 'Закрыть',
      rank: (rank: number) => `№ ${num(rank)}`,
      points: 'Очки',
      record: 'Победы–поражения',
      winRate: 'Доля побед',
      matches: 'Поединки',
      byGroup: 'У кого он побеждает',
      noVotes: 'голосов пока нет',
      headToHead: 'Личные встречи',
      noMatches: 'Он ещё не встречался с другими постерами.',
      more: (n: number) => `и ещё ${num(n)}`
    }
  }
};
