import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const rolesData = [
  {
    title: "Product Manager (L4)",
    level: "L4",
    industry: "Tech / FoodTech",
    job_description: JSON.stringify([
      {
        parameter: "Analytical Thinking",
        poor: "Struggles to interpret A/B test results; relies on anecdotes or 'gut feel'; cannot explain the 'why' behind a metric drop.",
        borderline: "Can read a standard dashboard but misses nuances like seasonality or sample size; identifies 'what' happened but fails to propose a data-backed 'next step'.",
        good: "Consistently uses data to drive decisions; identifies specific bottlenecks in the user journey; understands statistical significance and cohorts.",
        strong: "Connects disparate data points to uncover non-obvious insights; predicts long-term impact on complex metrics like LTV, CAC, and churn."
      },
      {
        parameter: "Problem Space Understanding",
        poor: "Jumps straight to 'we need a feature' without investigating the user pain; treats symptoms rather than root causes.",
        borderline: "Identifies a valid problem but proposes generic 'me-too' solutions that don't differentiate the product in the market.",
        good: "Clearly defines the 'Job to be Done'; understands the competitive landscape and how this solution fits into the user's daily habit.",
        strong: "Dissects deep psychological friction points; identifies high-leverage opportunities that others miss; reframes the problem to find simpler solutions."
      },
      {
        parameter: "Leadership & Stakeholder Mgmt",
        poor: "Struggles to get dev/design buy-in; works in a silo; communication is often reactive or defensive.",
        borderline: "Can manage tasks but fails to align the team on the 'Why'; struggles to handle conflicting feedback from senior stakeholders.",
        good: "Actively manages stakeholders; builds consensus across functions; can say 'no' to features with clear reasoning.",
        strong: "Unites cross-functional teams under a singular, high-stakes vision; mentors junior PMs; drives company-wide product culture."
      },
      {
        parameter: "Effective Execution",
        poor: "Misses deadlines consistently; PRDs are vague and lead to significant engineering rework or confusion.",
        borderline: "Ships on time but requires heavy supervision on edge cases; struggles to prioritize a roadmap under pressure.",
        good: "Consistently ships high-quality features with clear success metrics; masters the balance between speed and quality.",
        strong: "Masters the 'MVP' mindset: ships the smallest possible increment that proves the most value; eliminates blockers proactively."
      }
    ]),
    candidates: [
      { name: "Arjun Mehta", email: "arjun.m@example.com", stage: "Strong", resume_url: "https://example.com/resumes/arjun.pdf" },
      { name: "Priya Singh", email: "priya.s@example.com", stage: "Good", resume_url: "https://example.com/resumes/priya.pdf" },
      { name: "Vikram Rao", email: "vikram.r@example.com", stage: "Mixed", resume_url: "https://example.com/resumes/vikram.pdf" },
      { name: "Sanya Gupta", email: "sanya.g@example.com", stage: "Borderline", resume_url: "https://example.com/resumes/sanya.pdf" },
      { name: "Rohan Das", email: "rohan.d@example.com", stage: "Poor", resume_url: "https://example.com/resumes/rohan.pdf" }
    ]
  },
  {
    title: "Software Engineer (L5)",
    level: "L5",
    industry: "Backend / Infrastructure",
    job_description: JSON.stringify([
      {
        parameter: "System Design",
        poor: "Proposes monolithic, tightly coupled designs; ignores single points of failure; fails to consider scaling.",
        borderline: "Understands basics but struggles with state management, data consistency, or handling 'hot spots' in the database.",
        good: "Designs decoupled, resilient systems; uses appropriate caching; understands trade-offs between SQL and NoSQL.",
        strong: "Architects for 10x current load (e.g., IPL peak traffic); implements sophisticated failover and circuit-breaking."
      },
      {
        parameter: "Concurrency & Distributed Systems",
        poor: "Unaware of race conditions or deadlocks; writes thread-unsafe code that causes unpredictable production crashes.",
        borderline: "Knows theory but struggles to implement complex locking, queuing, or async patterns correctly in production.",
        good: "Effectively uses Redis or Kafka for async processing; handles eventual consistency gracefully in a distributed environment.",
        strong: "Expertly manages distributed locks; optimizes for high-throughput with low latency; understands low-level CPU/Memory implications."
      },
      {
        parameter: "Code Quality & Mentorship",
        poor: "Hard-to-read code; zero tests; 'spaghetti' logic that is difficult for others to maintain or extend.",
        borderline: "Functional code but lacks documentation or modularity; rarely participates in or provides value in code reviews.",
        good: "Clean, idiomatic code with robust unit/integration tests; actively helps teammates improve their code quality.",
        strong: "Writes 'Self-Documenting' code; drives team-wide coding standards; mentors junior engineers into high-performers."
      },
      {
        parameter: "Debugging & Observability",
        poor: "Gets lost in logs; relies on trial-and-error fixes; doesn't understand how to use production monitoring tools.",
        borderline: "Can fix known bugs but struggles to find the root cause in complex, distributed environments.",
        good: "Efficiently uses observability tools (Datadog, Sentry, ELK) to trace errors in production and fix them permanently.",
        strong: "Predicts failures before they happen via proactive monitoring; builds 'self-healing' systems; masters post-mortem analysis."
      }
    ]),
    candidates: [
      { name: "Ishaan Sharma", email: "ishaan.s@example.com", stage: "Strong", resume_url: "https://example.com/resumes/ishaan.pdf" },
      { name: "Meera Nair", email: "meera.n@example.com", stage: "Good", resume_url: "https://example.com/resumes/meera.pdf" },
      { name: "Aditya Verma", email: "aditya.v@example.com", stage: "Mixed", resume_url: "https://example.com/resumes/aditya.pdf" },
      { name: "Kavya Iyer", email: "kavya.i@example.com", stage: "Borderline", resume_url: "https://example.com/resumes/kavya.pdf" },
      { name: "Siddharth Malhotra", email: "siddharth.m@example.com", stage: "Poor", resume_url: "https://example.com/resumes/siddharth.pdf" }
    ]
  },
  {
    title: "Data Analyst",
    level: "L3/L4",
    industry: "Analytics / Business Intelligence",
    job_description: JSON.stringify([
      {
        parameter: "SQL & Data Retrieval",
        poor: "Struggles with basic joins; writes inefficient queries that time out; ignores data quality issues.",
        borderline: "Can write standard SQL but struggles with window functions or complex aggregations; misses outliers.",
        good: "Writes clean, optimized SQL; validates data sources; effectively uses CTEs and advanced analytical functions.",
        strong: "Expert at large-scale data modeling; optimizes queries for massive datasets; automates complex ETL processes."
      },
      {
        parameter: "Data Storytelling & Visualization",
        poor: "Produces cluttered dashboards; fails to highlight key takeaways; audience is left confused by the output.",
        borderline: "Functional charts but lacks a narrative; misses the 'so what' factor; uses inappropriate chart types.",
        good: "Creates clear, impactful visualizations; translates complex data into actionable business insights.",
        strong: "Masters strategic storytelling; influences senior leadership with compelling data narratives; drives automated insights."
      },
      {
        parameter: "Statistical Rigor",
        poor: "Ignores statistical significance; confuses correlation with causation; makes biased interpretations.",
        borderline: "Understands basics but misses nuances in hypothesis testing or sample bias.",
        good: "Correctly applies statistical tests; understands p-values and confidence intervals; accounts for variability.",
        strong: "Applies sophisticated statistical modeling; designs robust experiments (A/B testing, causal inference)."
      },
      {
        parameter: "Business Acumen",
        poor: "Focuses on metrics that don't matter; fails to connect analysis to company goals.",
        borderline: "Identifies trends but struggles to estimate their commercial impact or priority.",
        good: "Understands core business drivers; aligns analysis with product/marketing strategies.",
        strong: "Proactively identifies multi-million dollar opportunities; acts as a strategic partner to business units."
      }
    ]),
    candidates: [
      { name: "Ananya Kapoor", email: "ananya.k@example.com", stage: "Strong", resume_url: "https://example.com/resumes/ananya.pdf" },
      { name: "Rahul Khanna", email: "rahul.k@example.com", stage: "Good", resume_url: "https://example.com/resumes/rahul.pdf" },
      { name: "Tanya Bansal", email: "tanya.b@example.com", stage: "Mixed", resume_url: "https://example.com/resumes/tanya.pdf" },
      { name: "Amit Shah", email: "amit.s@example.com", stage: "Borderline", resume_url: "https://example.com/resumes/amit.pdf" },
      { name: "Neha Roy", email: "neha.r@example.com", stage: "Poor", resume_url: "https://example.com/resumes/neha.pdf" }
    ]
  },
  {
    title: "AI Product Manager",
    level: "L5",
    industry: "AI / Machine Learning",
    job_description: JSON.stringify([
      {
        parameter: "AI Fundamentals",
        poor: "Treats AI as a 'black box'; unaware of concepts like hallucination, latency, or bias.",
        borderline: "Has surface-level knowledge but struggles to explain technical constraints to non-tech stakeholders.",
        good: "Understand LLM architectures, fine-tuning, and RAG trade-offs; defines clear model evaluation criteria.",
        strong: "Expertly balances technical feasibility with product innovation; anticipates model evolution and ethical implications."
      },
      {
        parameter: "User Experience for AI",
        poor: "Applies traditional UI patterns to AI features; fails to handle non-deterministic outputs gracefully.",
        borderline: "Builds functional but rigid AI interfaces; misses opportunities for interactive feedback or prompt steering.",
        good: "Designs intuitive AI interactions; manages user expectations around uncertainty; creates robust feedback loops.",
        strong: "Pioneers new interaction paradigms for generative AI; creates seamless, agentic experiences that feel magical."
      },
      {
        parameter: "Evaluation & Benchmarking",
        poor: "Resorts to 'vibes-based' evaluation; ignores objective accuracy or latency metrics.",
        borderline: "Uses basic metrics but misses nuances like cost-per-token, drift, or safety guardrails.",
        good: "Builds comprehensive evaluation frameworks; uses automated and human-in-the-loop benchmarks.",
        strong: "Defines the industry standard for AI product quality; drives rigorous, data-backed model selection strategies."
      },
      {
        parameter: "Strategic Roadmap",
        poor: "Follows AI hype without considering business value; roadmap is a collection of disjointed 'cool' features.",
        borderline: "Identifies valid AI use cases but fails to prioritize based on moat-building or defensibility.",
        good: "Connects AI capabilities to long-term business strategy; builds scalable, value-driven AI product roadmaps.",
        strong: "Articulates a visionary AI strategy that creates significant competitive advantage; leads the market in AI adoption."
      }
    ]),
    candidates: [
      { name: "Zoya Malik", email: "zoya.m@example.com", stage: "Strong", resume_url: "https://example.com/resumes/zoya.pdf" },
      { name: "Aryan Reddy", email: "aryan.r@example.com", stage: "Good", resume_url: "https://example.com/resumes/aryan.pdf" },
      { name: "Simran Kaur", email: "simran.k@example.com", stage: "Mixed", resume_url: "https://example.com/resumes/simran.pdf" },
      { name: "Deepak Joshi", email: "deepak.j@example.com", stage: "Borderline", resume_url: "https://example.com/resumes/deepak.pdf" },
      { name: "Lisa Wong", email: "lisa.w@example.com", stage: "Poor", resume_url: "https://example.com/resumes/lisa.pdf" }
    ]
  }
]

async function main() {
  console.log('Start seeding...')
  for (const roleData of rolesData) {
    const role = await prisma.role.upsert({
      where: { id: roleData.title }, // This is a trick since id is cuid, but we want idempotency. 
                                    // Actually, let's search by title since our schema doesn't have a unique title.
      // Refined approach: check if title exists first.
      update: {},
      create: {
        title: roleData.title,
        level: roleData.level,
        industry: roleData.industry,
        job_description: roleData.job_description,
      },
    })

    // To handle idempotency properly with cuid ids, we'll look up by title
    const existingRole = await prisma.role.findFirst({ where: { title: roleData.title } })
    const targetRoleId = existingRole!.id

    // Update the role with job description in case it changed
    await prisma.role.update({
      where: { id: targetRoleId },
      data: {
        level: roleData.level,
        industry: roleData.industry,
        job_description: roleData.job_description,
      }
    })

    for (const cand of roleData.candidates) {
      await prisma.candidate.upsert({
        where: { id: cand.email }, // Trick: Candidate email is not unique in schema, but we'll use it for seeding logic
        update: {
          name: cand.name,
          stage: cand.stage,
          resume_url: cand.resume_url,
          role_id: targetRoleId,
        },
        create: {
          name: cand.name,
          email: cand.email,
          stage: cand.stage,
          resume_url: cand.resume_url,
          role_id: targetRoleId,
        },
      })
    }
  }
  console.log('Seeding finished.')
}

// Since Candidate schema doesn't have a unique field, 
// I'll adjust the main function to be safer for multiple runs.

async function mainFixed() {
  console.log('Start seeding...')
  for (const roleData of rolesData) {
    let role = await prisma.role.findFirst({ where: { title: roleData.title } })
    
    if (role) {
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          level: roleData.level,
          industry: roleData.industry,
          job_description: roleData.job_description,
        }
      })
    } else {
      role = await prisma.role.create({
        data: {
          title: roleData.title,
          level: roleData.level,
          industry: roleData.industry,
          job_description: roleData.job_description,
        }
      })
    }

    for (const cand of roleData.candidates) {
      const existingCandidate = await prisma.candidate.findFirst({ 
        where: { email: cand.email, role_id: role.id } 
      })

      if (existingCandidate) {
        await prisma.candidate.update({
          where: { id: existingCandidate.id },
          data: {
            name: cand.name,
            stage: cand.stage,
            resume_url: cand.resume_url,
          }
        })
      } else {
        await prisma.candidate.create({
          data: {
            name: cand.name,
            email: cand.email,
            stage: cand.stage,
            resume_url: cand.resume_url,
            role_id: role.id,
          }
        })
      }
    }
  }
  console.log('Seeding finished.')
}

mainFixed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
