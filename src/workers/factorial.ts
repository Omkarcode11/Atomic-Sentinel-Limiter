const { parentPort } = require("worker_threads");

function factorial(num: number): number {
  let res = 1;

  for (let i = 1; i <= num; i++) {
    res *= i;
  }

  return res;
}

parentPort.on("message", (num: number) => {
  let result = factorial(num);
  parentPort.postMessage(result);
});
