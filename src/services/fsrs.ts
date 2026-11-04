/**
 * FSRS v5 implementation (Free Spaced Repetition Scheduler v5)
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 * Mathematical formulas strictly calculate dynamic intervals from stability S, difficulty D, reps, lapses, and elapsed_days.
 */

export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export enum State {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export interface FSRSParameters {
  request_retention: number
  maximum_interval: number
  w: number[]
}

export const defaultParameters: FSRSParameters = {
  request_retention: 0.9,
  maximum_interval: 36500,
  // FSRS v5 default 19 weights
  w: [
    0.40255, 1.18385, 3.173, 15.69105,
    7.1949, 0.5345, 1.4604, 0.0046,
    1.54575, 0.1192, 1.01925,
    1.9395, 0.11, 0.29605, 0.22695, 0.56995,
    2.9444, 0.59255, 0.4137,
  ],
}

export interface CardState {
  stability: number
  difficulty: number
  reps: number
  lapses: number
  state: State
  last_review_at?: number | null
  due_at: number
  elapsed_days: number
  scheduled_days: number
}

export interface SchedulingInfo {
  card: CardState
  interval: number // in days or fractional days
  intervalText: string
}

export interface RecordLog {
  [Rating.Again]: SchedulingInfo
  [Rating.Hard]: SchedulingInfo
  [Rating.Good]: SchedulingInfo
  [Rating.Easy]: SchedulingInfo
}

/**
 * Clamp difficulty between 1 and 10
 */
function constrainDifficulty(d: number): number {
  return Math.min(10, Math.max(1, d))
}

/**
 * Initial stability for first review (reps = 0)
 */
function initStability(rating: Rating, w: number[]): number {
  return Math.max(0.1, w[rating - 1])
}

/**
 * Initial difficulty for first review
 */
function initDifficulty(rating: Rating, w: number[]): number {
  return constrainDifficulty(w[4] - Math.exp(w[5] * (rating - 1)) + 1)
}

/**
 * Retrievability calculation R(t, S) = (1 + factor * t / S)^decay
 */
function calculateRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0
  const factor = 19 / 81
  const decay = -0.5
  return Math.pow(1 + factor * (elapsedDays / stability), decay)
}

/**
 * Next difficulty upon review
 */
function nextDifficulty(d: number, rating: Rating, w: number[]): number {
  const nextD = d - w[6] * (rating - 3)
  const meanReversion = w[7] * (initDifficulty(Rating.Easy, w) - nextD)
  return constrainDifficulty(nextD + meanReversion)
}

/**
 * Stability update upon successful recall
 */
function nextRecallStability(d: number, s: number, r: number, rating: Rating, w: number[]): number {
  const hardPenalty = rating === Rating.Hard ? w[15] : 1
  const easyBonus = rating === Rating.Easy ? w[16] : 1
  const newS = s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hardPenalty * easyBonus)
  return Math.max(0.1, newS)
}

/**
 * Stability update upon forgetting (Again)
 */
function nextForgetStability(d: number, s: number, r: number, w: number[]): number {
  const newS = w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14])
  return Math.min(s, Math.max(0.1, newS))
}

/**
 * Compute next review interval in days based on Stability S and Request Retention
 */
function nextInterval(s: number, requestRetention: number, maxInterval: number): number {
  const factor = 19 / 81
  const decay = -0.5
  // S * ((R^(1/decay) - 1) / factor)
  const ivl = (s / factor) * (Math.pow(requestRetention, 1 / decay) - 1)
  return Math.min(maxInterval, Math.max(1, Math.round(ivl)))
}

/**
 * Format interval into human-readable string for UI button labels
 */
export function formatInterval(days: number, state: State, rating: Rating): string {
  if (rating === Rating.Again) {
    return '< 10 mins'
  }
  if (state === State.New || state === State.Learning || state === State.Relearning) {
    if (rating === Rating.Hard) return '12 hrs'
    if (rating === Rating.Good) return '1 day'
    if (rating === Rating.Easy) {
      const d = Math.max(2, Math.round(days))
      return `${d} ${d === 1 ? 'day' : 'days'}`
    }
  }

  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24))
    return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`
  }
  const rounded = Math.round(days)
  if (rounded === 1) return '1 day'
  if (rounded < 30) return `${rounded} days`
  if (rounded < 365) {
    const months = +(rounded / 30.4).toFixed(1)
    return `${months} mo`
  }
  const years = +(rounded / 365).toFixed(1)
  return `${years} yr`
}

/**
 * Schedule next states for all 4 ratings (Again, Hard, Good, Easy)
 */
export function repeat(card: CardState, now: Date = new Date(), params: FSRSParameters = defaultParameters): RecordLog {
  const w = params.w
  const nowMs = now.getTime()
  const isNew = card.state === State.New || card.reps === 0

  const elapsedDays = card.last_review_at ? Math.max(0, (nowMs - card.last_review_at) / (1000 * 60 * 60 * 24)) : 0
  const currentR = isNew ? 1 : calculateRetrievability(elapsedDays, card.stability)

  const scheduleFor = (rating: Rating): SchedulingInfo => {
    let nextS: number
    let nextD: number
    let nextState: State
    let nextReps: number = card.reps + 1
    let nextLapses: number = card.lapses
    let intervalDays: number
    let dueAtMs: number

    if (isNew) {
      nextD = initDifficulty(rating, w)
      nextS = initStability(rating, w)

      if (rating === Rating.Again) {
        nextState = State.Learning
        nextLapses = card.lapses + 1
        intervalDays = 0 // < 10 mins
        dueAtMs = nowMs + 10 * 60 * 1000 // 10 minutes
      } else if (rating === Rating.Hard) {
        nextState = State.Learning
        intervalDays = 0.5 // 12 hours
        dueAtMs = nowMs + 12 * 60 * 60 * 1000
      } else if (rating === Rating.Good) {
        nextState = State.Learning
        intervalDays = 1
        dueAtMs = nowMs + 24 * 60 * 60 * 1000
      } else {
        nextState = State.Review
        intervalDays = nextInterval(nextS, params.request_retention, params.maximum_interval)
        dueAtMs = nowMs + intervalDays * 24 * 60 * 60 * 1000
      }
    } else {
      // Review or Learning
      if (rating === Rating.Again) {
        nextD = nextDifficulty(card.difficulty, rating, w)
        nextS = nextForgetStability(card.difficulty, card.stability, currentR, w)
        nextState = State.Relearning
        nextLapses = card.lapses + 1
        intervalDays = 0
        dueAtMs = nowMs + 10 * 60 * 1000
      } else {
        nextD = nextDifficulty(card.difficulty, rating, w)
        nextS = nextRecallStability(card.difficulty, card.stability, currentR, rating, w)
        nextState = State.Review
        if (rating === Rating.Hard) {
          // Hard interval is conservatively 1.2 * S or min 1 day
          intervalDays = Math.max(1, Math.round(nextInterval(nextS * 0.75, params.request_retention, params.maximum_interval)))
        } else if (rating === Rating.Good) {
          intervalDays = nextInterval(nextS, params.request_retention, params.maximum_interval)
        } else {
          // Easy bonus
          intervalDays = nextInterval(nextS * 1.3, params.request_retention, params.maximum_interval)
        }
        dueAtMs = nowMs + intervalDays * 24 * 60 * 60 * 1000
      }
    }

    const scheduledCard: CardState = {
      stability: +nextS.toFixed(2),
      difficulty: +nextD.toFixed(2),
      reps: nextReps,
      lapses: nextLapses,
      state: nextState,
      last_review_at: nowMs,
      due_at: dueAtMs,
      elapsed_days: Math.round(elapsedDays),
      scheduled_days: Math.round(intervalDays),
    }

    return {
      card: scheduledCard,
      interval: intervalDays,
      intervalText: formatInterval(intervalDays, card.state, rating),
    }
  }

  return {
    [Rating.Again]: scheduleFor(Rating.Again),
    [Rating.Hard]: scheduleFor(Rating.Hard),
    [Rating.Good]: scheduleFor(Rating.Good),
    [Rating.Easy]: scheduleFor(Rating.Easy),
  }
}
