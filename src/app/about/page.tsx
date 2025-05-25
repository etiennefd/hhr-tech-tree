import Link from 'next/link'
import { execSync } from 'child_process'

function getLastUpdatedDate() {
  try {
    const date = execSync(
      'git log -1 --format="%ad" --date=format:"%B %d, %Y" src/app/about/page.tsx',
      { encoding: 'utf-8' }
    ).trim()
    return date
  } catch (error) {
    console.error('Error getting last updated date:', error)
    return 'Unknown date'
  }
}

export default function AboutPage() {
  const darkerBlue = "#6B98AE";
  const linkStyle = { 
    color: darkerBlue, 
    textDecoration: "underline",
    transition: "opacity 0.2s",
    "&:hover": {
      opacity: 0.8
    }
  };

  const lastUpdated = getLastUpdatedDate()

  return (
    <div className="min-h-screen bg-yellow-50">
      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="mb-8">
          <Link href="/" className="inline-block" style={linkStyle}>
            ← Back to the tech tree
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8" style={{ color: darkerBlue }}>
          About the Historical Tech Tree
        </h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-8">
          <div className="bg-yellow-100/50 p-6 rounded-lg mb-8">
            <ul className="space-y-2 font-mono">
              <li><a href="#introduction" style={linkStyle}>1. Introduction</a></li>
              <li>
                <a href="#assumptions" style={linkStyle}>2. Assumptions and design choices</a>
                <ul className="ml-6 mt-2 space-y-1">
                  <li><a href="#definition" style={linkStyle}>2.1. Definition of technology</a></li>
                  <li><a href="#discretization" style={linkStyle}>2.2. Discretization</a></li>
                  <li><a href="#dates" style={linkStyle}>2.3. Dates</a></li>
                  <li><a href="#connections" style={linkStyle}>2.4. Connections</a></li>
                </ul>
              </li>
              <li>
                <a href="#contributing" style={linkStyle}>3. Contributing</a>
                <ul className="ml-6 mt-2 space-y-1">
                  <li><a href="#suggesting" style={linkStyle}>3.1. Suggesting content</a></li>
                  <li><a href="#financial" style={linkStyle}>3.2. Financial support</a></li>
                </ul>
              </li>
              <li><a href="#resources" style={linkStyle}>4. Additional resources</a></li>
            </ul>
          </div>

          <section id="introduction">
            <h2 className="text-2xl font-bold mb-6" style={{ color: darkerBlue }}>
              1. Introduction
            </h2>

            <div className="space-y-6">
              <p>
                The historical tech tree is a project by <a href="https://www.hopefulmons.com/" target="_blank" rel="noopener noreferrer" style={linkStyle}>Étienne Fortier-Dubois</a> to 
                visualize the entire history of technologies, inventions, and (some) discoveries, from prehistory to today. 
                Unlike other visualizations of the sort, the tree emphasizes the connections between technologies: prerequisites, 
                improvements, inspirations, and so on.
              </p>

              <p>
                These connections allow viewers to understand how technologies 
                came about, at least to some degree, thus revealing the entire history in more detail than a simple 
                timeline, and with more breadth than most historical narratives. The goal is not to predict future technology, except in the weak sense that knowing history can help form a better model of the world. Rather, the point of the tree is to create an easy way to explore the history of technology, discover unexpected patterns and connections, and generally make the complexity of modern tech feel less daunting.
              </p>

              <p>
                The idea of tech trees comes from games, especially the <em>Civilization</em> series. But game tech trees 
                optimize for fun, not accuracy. They have often been criticized, and for good reason: they embed 
                assumptions about the nature of technological progress that can be problematic. For example, they 
                force technology to advance in a predetermined way; they rely on certain cultural ideas about 
                progress; and they&apos;re simplistic.
              </p>

              <p>
                This historical tech tree presented here is not a game tree.
                It is also constrained by assumptions, but different ones.
              </p>
            </div>
          </section>

          <section id="assumptions" className="mt-12">
            <h2 className="text-2xl font-bold mb-6" style={{ color: darkerBlue }}>
              2. Assumptions and design choices
            </h2>

            <p className="mb-4">
              Some of the core assumptions of the tree include:
            </p>

            <ol className="list-decimal pl-6 space-y-4">
              <li><strong>Definition of technology</strong>: There is such a thing as &quot;technology&quot; as distinct from the full set of events and ideas in history.</li>
              <li><strong>Discretization</strong>: Technologies can be discretized into single events to a reasonable degree.</li>
              <li><strong>Dates</strong>: These discrete technologies can be assigned a specific date on a timeline.</li>
              <li><strong>Connections</strong>: Technologies &quot;descend&quot; from one another, thus creating a tree structure (or, in more precise terminology, a directed acyclic graph).</li>
            </ol>

            <p className="mt-6">
              Each of these assumptions in turn requires making some design choices, keeping in mind the goal of building a practical visualization. 
              There are tradeoffs for each.
            </p>

            <div className="space-y-8 mt-6">
              <div>
                <h3 id="definition" className="text-xl font-bold mb-4" style={{ color: darkerBlue }}>
                  2.1. Definition of technology
                </h3>
                <p className="mb-4">
                  A technology is, in the ideal case, a piece of knowledge (an idea) that is created intentionally by humans for a practical purpose (not for its own sake) and is implemented in some kind of physical substrate.
                </p>
                <ul className="list-disc pl-6 space-y-3">
                  <li>
                    Defining things is hard, so the above is not a perfect definition. Something may be called a technology 
                    without satisfying all characteristics. For example, some technologies like vulcanization and penicillin 
                    were discovered by chance, and some, like software or specific techniques, are arguably not physical, 
                    but they&apos;re still generally considered technologies.
                  </li>
                  <li>
                    But other things are generally not, such as works of art and games (which are created for their own sake), 
                    biological traits (not human and not intentional), and philosophical, theological, or political ideas (not physical and often not practical).
                  </li>
                  <li>
                    An illustrative example comes from music. Musical instruments are technologies, since they&apos;re constructed for the practical purpose of making music; but music itself, including specific music pieces, genres, and techniques for playing or composing, is done for its own sake, so is not considered a technology. For more discussion of this, see my article <a href="https://www.hopefulmons.com/p/what-counts-as-a-technology" target="_blank" rel="noopener noreferrer" style={linkStyle}>What Counts as a Technology?</a>
                  </li>
                  <li>
                    Scientific and mathematical discoveries are an edge case. Some particularly important ones are included in the tree when they help understand the history, but unlike for more typical technologies, I have no intention of comprehensiveness for them.
                  </li>
                </ul>
              </div>

              <div>
                <h3 id="discretization" className="text-xl font-bold mb-4" style={{ color: darkerBlue }}>
                  2.2. Discretization
                </h3>
                <p className="mb-4">
                  The level of discretization chosen is approximately the same as Wikipedia&apos;s: if a technology has its own Wikipedia page, it&apos;s a strong signal that it should be in the tree.
                </p>
                <ul className="list-disc pl-6 space-y-3">
                  <li>
                    This means the tree does not reach a sufficiently high resolution to describe unimplemented ideas, prototypes, 
                    failed commercialization attempts, patents, etc. In return, the benefit is that building the tree is feasible at all!
                  </li>
                  <li>
                    Independent inventions happen often, but are usually included only once. Exceptions exist for cases like 
                    the invention of writing, where each independent event played a different technological role in its 
                    part of the world.
                  </li>
                </ul>
              </div>

              <div>
                <h3 id="dates" className="text-xl font-bold mb-4" style={{ color: darkerBlue }}>
                  2.3. Dates
                </h3>
                <p className="mb-4">
                  Most technologies could be assigned several different dates, but a constraint of a timeline is that one date must be picked.
                </p>
                <ul className="list-disc pl-6 space-y-3">
                  <li>
                    For prehistoric, ancient, and medieval tech, the date is often the oldest archeological or documentary 
                    evidence available, with the understanding that the technology may in fact be much older. The date could 
                    change in the future as we uncover new evidence. Such dates are often approximations.
                  </li>
                  <li>
                    For more recent tech, a choice must often be made between unimplemented ideas, prototypes, failed 
                    commercialization attempts, patents, etc. By default, the preferred date is the first practical version, 
                    but it&apos;s not always straightforward to determine that. If different versions of a tech each played a key role in their field, then they can all be included individually.
                  </li>
                </ul>
              </div>

              <div>
                <h3 id="connections" className="text-xl font-bold mb-4" style={{ color: darkerBlue }}>
                  2.4. Connections
                </h3>
                <p className="mb-4">
                  There isn&apos;t really such a thing as a technology that appears out of nowhere: virtually every innovation comes from several existing ones, or at least from something that exists in nature. The tech tree is based on the idea that we can find most of these connections and represent them.
                </p>
                <ul className="list-disc pl-6 space-y-3">
                  <li>
                    Since the tree doesn&apos;t represent non-technologies, there are many connections from and to things like 
                    nature or artworks that aren&apos;t represented.
                  </li>
                  <li>
                    Connections are sometimes obvious, but not always, and they&apos;re not always well documented! The tree 
                    should therefore be considered to be missing many of them.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section id="contributing" className="mt-12">
            <h2 className="text-2xl font-bold mb-6" style={{ color: darkerBlue }}>
              3. Contributing
            </h2>

            <h3 id="suggesting" className="text-xl font-bold mb-4" style={{ color: darkerBlue }}>
              3.1. Suggesting content
            </h3>

            <p>
              At the time of publicly releasing this project on May 26, 2025, the tree contained about 1,750 technologies and 2,000 connections 
              between them. They were all compiled manually by myself. Going forward, the tree is open to contributions from 
              visitors, with the goal of coming up with the most complete possible diagram of technology, though whether it 
              can one day be &quot;fully&quot; complete is an open question.
            </p>

            <p className="mt-4">To contribute, you can use the forms below or <a href="mailto:contact@etiennefd.com" style={linkStyle}>contact the author</a>.</p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li><a href="https://airtable.com/appmQuONO382L03FY/paggvkJsCPLV4kREr/form" target="_blank" rel="noopener noreferrer" style={linkStyle}>Suggest an additional technology</a></li>
              <li><a href="https://airtable.com/appmQuONO382L03FY/pagEg9lS1crt6nuqY/form" target="_blank" rel="noopener noreferrer" style={linkStyle}>Suggest a new connection</a></li>
              <li><a href="https://airtable.com/appmQuONO382L03FY/pagNcBGN2JzHckpTP/form" target="_blank" rel="noopener noreferrer" style={linkStyle}>Report a problem</a></li>
            </ul>

            <h3 id="financial" className="text-xl font-bold mb-4 mt-8" style={{ color: darkerBlue }}>
              3.2. Financial support
            </h3>

            <p>
              Hosting the tree incurs some costs. If you want to support the project financially, the easiest way is to get a paid subscription to <a href="https://www.hopefulmons.com/" target="_blank" rel="noopener noreferrer" style={linkStyle}>my Substack</a>. I&apos;ll likely add other options in the future, so please let me know if you&apos;d like to support the project in some other way!
            </p>
          </section>

          <section id="resources" className="mt-12">
            <h2 className="text-2xl font-bold mb-6" style={{ color: darkerBlue }}>
              4. Additional resources
            </h2>

            <ul className="list-disc pl-6 space-y-2">
              <li><Link href="/image-credits" style={linkStyle}>Image credits</Link></li>
              <li>Original announcement (soon)</li>
              <li>Article in Asterisk Magazine (soon)</li>
            </ul>
          </section>

          <div className="mt-12 pt-6 border-t border-gray-300 flex justify-between items-center">
            <Link href="/" className="inline-block" style={linkStyle}>
              ← Back to the tech tree
            </Link>
            <p className="text-sm text-gray-500 italic">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 