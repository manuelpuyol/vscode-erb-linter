import {resolve} from 'path'
import * as Mocha from 'mocha'
import * as glob from 'glob'

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  })

  const testsRoot = resolve(__dirname, '..')

  return new Promise((c, e) => {
    glob('**/**.test.js', {cwd: testsRoot}, (err, files) => {
      if (err) {
        return e(err)
      }

      // Add files to the test suite
      for (const f of files) {
        mocha.addFile(resolve(testsRoot, f))
      }

      try {
        // Run the mocha test
        mocha.run(failures => {
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`))
          } else {
            c()
          }
        })
      } catch (error) {
        console.error(error)
        e(error)
      }
    })
  })
}
