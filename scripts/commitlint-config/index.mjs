// 获取提交消息文件的路径
import path from "node:path";
import {readFileSync} from "node:fs";
import process from "node:process";
import {colors, consola} from "@nova-ai/node-utils"

const msgPath = path.resolve('.git/COMMIT_EDITMSG')
// 读取提交消息文件的内容，并去除两端的空白字符
const msg = readFileSync(msgPath, 'utf-8').trim()

// 定义提交消息格式的正则表达式
const commitRE =
    /^(revert: )?(feat|fix|docs|dx|style|refactor|perf|test|workflow|build|ci|chore|types|wip|release)(\(.+\))?: .{1,50}/

// 测试提交消息是否符合格式
if (!commitRE.test(msg)) {
    consola.box("commitlint-config")
    consola.error(
        `  ${colors.white(colors.bgRed(' ERROR '))} ${colors.red(`invalid commit message format.`)}\n\n` +
        colors.red(
            `  Proper commit message format is required for automated changelog generation. Examples:\n\n`
        ) +
        `    ${colors.green(`feat(compiler): add 'comments' option`)}\n` +
        `    ${colors.green(`fix(v-model): handle events on blur (close #28)`)}\n\n` +
        colors.red(`  See .github/commit-convention.md for more details.\n`)
    )
    process.exit(1) // 退出进程并返回状态码 1，表示错误
}
