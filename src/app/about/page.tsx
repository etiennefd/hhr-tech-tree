import Link from 'next/link'

export default function AboutPage() {
  const darkerBlue = "#6B98AE";
  const linkStyle = { color: darkerBlue, textDecoration: "underline" };

  return (
    <div className="min-h-screen bg-yellow-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: darkerBlue }}>
          About the Historical Tech Tree
        </h1>

        <div className="mb-6">
          <Link href="/" className="inline-block" style={linkStyle}>
            ← Back to the tech tree
          </Link>
        </div>

        <div className="space-y-6 text-gray-700">
          <p>
            The historical tech tree is a project by <a href="https://www.hopefulmons.com/" target="_blank" rel="noopener noreferrer" style={linkStyle}>Étienne Fortier-Dubois</a> to 
            visualize the entire history of technologies, inventions, and (some) discoveries, from prehistory to today. 
            Unlike other visualizations of the sort, the tree emphasizes the connections between technologies: prerequisites, 
            improvements, inspirations, and so on. These connections allow viewers to understand how technologies 
            came about, at least to some degree, thus revealing the entire history in more detail than a simple 
            timeline, and with more breadth than most historical narratives.
          </p>

          <p>
            The idea of tech trees comes from games, especially the <em>Civilization</em> series. But game tech trees 
            optimize for fun, not accuracy. They have often been criticized, and for good reason: they embed 
            assumptions about the nature of technological progress that can be problematic. For example, they 
            constrain technology to advance in a predetermined way; they rely on certain cultural ideas about 
            progress; and they&apos;re simplistic.
          </p>

          <p>
            This historical tech tree presented here is not a game tree. Its only goal is to show what happened. 
            Of course, like game trees, it is also constrained by assumptions, but  different ones.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: darkerBlue }}>
            Assumptions and design choices
          </h2>

          <p>
            Some of the core assumptions of the tree include:
          </p>

          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Definition of technology</strong>: There is such a thing as &quot;technology&quot; as distinct from the full set of events and ideas in history.</li>
            <li><strong>Discretization</strong>: Technologies can be discretized into single events to a reasonable degree.</li>
            <li><strong>Dates</strong>: These discrete technologies can be assigned a specific date on a timeline.</li>
            <li><strong>Connections</strong>: Technologies &quot;descend&quot; from one another, thus creating a tree structure (or, in more precise terminology, a directed acyclic graph).</li>
          </ol>

          <p>
            Each of these assumptions in turn requires making some design choices, keeping in mind the goal of building a practical visualization. 
            There are tradeoffs for each.
          </p>

          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Definition of technology</strong>: A technology is, in the ideal case, a piece of knowledge (an idea) 
              that is created intentionally by humans for a practical purpose (not for its own sake) and is implemented 
              in some kind of physical substrate.
              <ol className="list-[lower-alpha] pl-5 space-y-2 mt-2">
                <li>
                  Defining things is hard, so the above is not a perfect definition. Something may be called a technology 
                  without satisfying all characteristics. For example, some technologies like vulcanization and penicillin 
                  were discovered by chance, and some, like software or specific techniques, are arguably not physical, 
                  but they&apos;re still generally considered technologies.
                </li>
                <li>
                  But other things are generally not, such as works of art and games (which are created for their own sake), 
                  biological traits (not human and not intentional), and philosophical ideas (not physical and often not practical).
                </li>
                <li>
                  An illustrative example comes from music. Musical instruments are technologies, since they're constructed for the practical purpose of making music; but music itself, including specific music pieces, genres, and techniques for playing or composing, is done for its own sake, so is not considered a technology. For more discussion of this, see my article <a href="https://www.hopefulmons.com/p/what-counts-as-a-technology" target="_blank" rel="noopener noreferrer" style={linkStyle}>What Counts as a Technology?</a>.
                </li>
                <li>
                  Scientific and mathematical discoveries are an edge case. Some particularly important ones are included in the tree when they help understand the history, but unlike for more typical technologies, I have no intention of comprehensiveness for them.
                </li>
              </ol>
            </li>
            <li>
              <strong>Discretization</strong>: The level of discretization chosen is approximately the same as Wikipedia&apos;s: 
              if a technology has its own Wikipedia page, it&apos;s a strong signal that it should be in the tree.
              <ol className="list-[lower-alpha] pl-5 space-y-2 mt-2">
                <li>
                  This means the tree does not reach a sufficiently high resolution to describe unimplemented ideas, prototypes, 
                  failed commercialization attempts, patents, etc. In return, the benefit is that building the tree is feasible at all!
                </li>
                <li>
                  Independent inventions happen often, but are usually included only once. Exceptions exist for cases like 
                  the invention of writing, where each independent event played a different technological role in its 
                  part of the world.
                </li>
              </ol>
            </li>
            <li>
              <strong>Dates</strong>: Most technologies could be assigned several different dates, but a constraint of a 
              timeline is that one date must be picked.
              <ol className="list-[lower-alpha] pl-5 space-y-2 mt-2">
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
              </ol>
            </li>
            <li>
              <strong>Connections</strong>: There isn&apos;t really such a thing as a technology that appears out of nowhere: 
              virtually every innovation comes from several existing ones, or at least from something that exists in nature. 
              The tech tree is based on the idea that we can find most of these connections and represent them.
              <ol className="list-[lower-alpha] pl-5 space-y-2 mt-2">
                <li>
                  Since the tree doesn&apos;t represent non-technologies, there are many connections from and to things like 
                  nature or artworks that aren&apos;t represented.
                </li>
                <li>
                  Connections are sometimes obvious, but not always, and they&apos;re not always well documented! The tree 
                  should therefore be considered to be missing many of them.
                </li>
              </ol>
            </li>
          </ol>

          <p>
            The goal of doing all this is to allow a better way to explore the history of technology, discover unexpected 
            patterns and connections, and generally make the complexity of modern tech feel less daunting.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: darkerBlue }}>
            Contributing
          </h2>

          <p>
            At the time of publicly releasing this project, the tree contained about 1,750 technologies and 2,000 connections 
            between them. They were all compiled manually by myself. Going forward, the tree is open to contributions from 
            visitors, with the goal of coming up with the most complete possible diagram of technology, though whether it 
            can one day be &quot;fully&quot; complete is an open question.
          </p>

          <p>To contribute, you can use the forms below or <a href="mailto:contact@etiennefd.com" style={linkStyle}>contact the author</a>.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><a href="https://airtable.com/appmQuONO382L03FY/paggvkJsCPLV4kREr/form" target="_blank" rel="noopener noreferrer" style={linkStyle}>Suggest an additional technology</a></li>
            <li><a href="https://airtable.com/appmQuONO382L03FY/pagEg9lS1crt6nuqY/form" target="_blank" rel="noopener noreferrer" style={linkStyle}>Suggest a new connection</a></li>
            <li><a href="https://airtable.com/appmQuONO382L03FY/pagNcBGN2JzHckpTP/form" target="_blank" rel="noopener noreferrer" style={linkStyle}>Report a problem</a></li>
          </ul>

          <p>Hosting the tree incurs some costs. If you want to support the project financially, the easiest way is to get a paid subscription to <a href="https://www.hopefulmons.com/" target="_blank" rel="noopener noreferrer" style={linkStyle}>my Substack</a>. I&apos;ll likely add other options in the future, so please let me know if you&apos;d like to support the project in some other way!</p>

          <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: darkerBlue }}>
            Additional resources
          </h2>

          <ul className="list-disc pl-5 space-y-2">
            <li><Link href="/image-credits" style={linkStyle}>Image credits</Link></li>
            <li>Original announcement (soon)</li>
            <li>Article in Asterisk Magazine (soon)</li>
          </ul>

          <div className="mt-12 pt-6 border-t border-gray-300">
            <Link href="/" className="inline-block" style={linkStyle}>
              ← Back to the tech tree
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 