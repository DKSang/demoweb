import { YoutubeTranscript } from 'youtube-transcript';

async function run() {
  try {
    const t = await YoutubeTranscript.fetchTranscript('RJbUtcaoNCY');
    console.log(JSON.stringify(t.slice(0, 10), null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
