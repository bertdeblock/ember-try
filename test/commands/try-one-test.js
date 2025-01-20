import { expect } from 'chai';
import TryOneCommand from '../../lib/commands/try-one.js';

const origTryEachTask = TryOneCommand._TryEachTask;
const origGetConfig = TryOneCommand._getConfig;

describe('commands/try-one', () => {
  describe('getCommand', () => {
    it('returns args after --- as command args', () => {
      let args = TryOneCommand.getCommand([
        'ember',
        'try:one',
        'foo-bar-scenario',
        '--skip-cleanup',
        '---',
        'ember',
        'build',
      ]);
      expect(args).to.eql(['ember', 'build']);
    });

    it('returns no command args if no ---', () => {
      let args = TryOneCommand.getCommand([
        'ember',
        'try:one',
        'foo-bar-scenario',
        '--skip-cleanup',
      ]);
      expect(args).to.eql([]);
    });
  });

  describe('#run', () => {
    let mockConfig;

    function MockTryEachTask() {}
    MockTryEachTask.prototype.run = function () {};

    beforeEach(() => {
      TryOneCommand.project = { root: '' };

      TryOneCommand._getConfig = function () {
        return Promise.resolve(mockConfig || { scenarios: [] });
      };

      TryOneCommand._TryEachTask = MockTryEachTask;
    });

    afterEach(() => {
      delete TryOneCommand.project;

      TryOneCommand._TryEachTask = origTryEachTask;
      TryOneCommand._getConfig = origGetConfig;
      mockConfig = null;
    });

    it('throws if no scenario is provided', async () => {
      let error;

      try {
        await TryOneCommand.run({}, []);
      } catch (e) {
        error = e;
      }

      expect(error.message).to.include('requires a scenario name to be specified');
    });

    it('passes the configPath to _getConfig', async () => {
      let configPath;
      TryOneCommand._getConfig = async function (options) {
        configPath = options.configPath;

        return { scenarios: [{ name: 'foo' }] };
      };

      await TryOneCommand.run({ configPath: 'foo/bar/widget.js' }, ['foo']);

      expect(configPath).to.equal('foo/bar/widget.js');
    });

    it('throws if a scenario was not found for the scenarioName provided', () => {
      return TryOneCommand.run({}, ['foo']).catch((error) => {
        expect(error).to.match(/requires a scenario specified in the config/);
      });
    });

    it('sets command on task init', async () => {
      await testCommandSetsTheseAsCommandArgs('try:one default', []);
      await testCommandSetsTheseAsCommandArgs('try:one default --- ember help', ['ember', 'help']);
      await testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json', [
        'ember',
        'help',
        '--json',
      ]);
      await testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json=true', [
        'ember',
        'help',
        '--json=true',
      ]);
      await testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json true', [
        'ember',
        'help',
        '--json',
        'true',
      ]);
    });
  });
});

async function testCommandSetsTheseAsCommandArgs(command, expectedArgs) {
  let additionalArgs = command.split(' ');
  function MockTask(opts) {
    expect(opts.commandArgs).to.eql(expectedArgs);
  }
  MockTask.prototype.run = async function () {};
  TryOneCommand._TryEachTask = MockTask;
  TryOneCommand._commandLineArguments = function () {
    return [].concat(
      ['/usr/local/Cellar/node/5.3.0/bin/node', '/usr/local/bin/ember'],
      additionalArgs,
    );
  };

  TryOneCommand._getConfig = async function () {
    return Promise.resolve({ scenarios: [{ name: 'default' }] });
  };

  return await TryOneCommand.run({}, ['default']);
}
