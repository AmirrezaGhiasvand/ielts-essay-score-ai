# -------- Few-shot calibration examples --------
# Real human-scored essays used to anchor LLM scoring to real IELTS standards
# Essays marked "verified" have official examiner comments
# Essays marked "band only" rely on the human band score as a weaker signal

FEW_SHOT_EXAMPLES = [
    {
        "band": 6.0,
        "task_type": 2,
        "verified": True,
        "essay": """Nowadays, it is acknowledged that students from suburban areas find it tough to receive higher education. Whether it should be made easier for them to access university education becomes an ongoing concern, which incurs a highly-charged debate.Obviously, higher education opportunities bring about benefits to students in multiple ways. For example, higher education becomes increasingly important to senior high school graduates, partly it determines if they have the competitive edge in the job market, and partly because it is seen as a guarantee of a certain level of the mental ability, from the computer literacy that is required by the most employers to the capacities of acquiring new knowledge the soonest possible which is valued by most. With a university degree, students from rural areas obtain a job easily, thereby bettering their living conditions and their family as well.Higher education also, however, to impose a heavy burden on families since the rise in the tuition fees are increasingly beyond those families ability to afford. In addition, with the mounting evidence, a university degree is not always a guarantee of seizing a decent job; therefore, their living conditions are likely to able to earn back their tuition fee after graduation.""",
        "examiner_comment": "The linking words and phrases are used in a correct way. The range of vocabulary is sufficient here. There are some attempts to use more sophisticated words but many of them are inaccurate. Even though there are some errors in grammar and punctuation, they dont make the meaning much harder to understand. Overall, this essay seems worthy of IELTS Band 6.",
    },
    {
        "band": 6.5,
        "task_type": 2,
        "verified": False,
        "essay": """Poverty represents a worldwide crisis. It is the ugliest epidemic in a region, which could infect countries in the most debilitating ways. To tackle this issue, rich countries need to help those in need and give a hand when possible. I agree that there are several ways of aiding poor countries other than financial aid, like providing countries in need with engineers, workers, and soldiers who would build infrastructure. Building universities, hospitals, and roadways. By having a solid infrastructure, poor countries would be able to monetise their profits and build a stronger and more profitable economy which would help them in the long term. However, I do disagree that financial aid does not solve poverty, it does if used properly and efficiently. The most determining factor if financial aid would be the way to go, is by identifying what type of poor countries' representative are dealing with.""",
        "examiner_comment": "",
    },
    {
        "band": 7.0,
        "task_type": 2,
        "verified": True,
        "essay": """Nowadays, in our competitive world, to succeed, knowledge from school and university is not enough. Therefore, students who study from the school to university get fewer benefits and contribute less too, compared to those who travel or work and get experience and skills. There are two following reasons to support for my opinion. Firstly, at school and university, what group A gains is almost entirely theory. Of course, theory is very important, however, you cant do everything with just theory. You must have experience. Secondly, as group A students are contributing less, they surely get less benefit. Moreover, many companies which employ people in group A have to train them from ground-up. In conclusion, I think a student should travel or work before going to the university.""",
        "examiner_comment": "The use of language and ideas are good and so is the essay structure. Seems worthy of Band 7.",
    },
    {
        "band": 7.5,
        "task_type": 2,
        "verified": False,
        "essay": """The ability to associate at school has been a great concern. Owing to this, some assume that the optimal way to boost children's collaborative spirit is through school team sports. In my opinion, teaming up in school sports would be problematic, and therefore, should be implemented in certain occasions, with certain individuals. Initially, participating in team sports would put a tremendous risk in injuries. Inevitably, physical group activities require high-speed movements, resulting in harsh collisions. Another point to consider is that joining team sports can effortlessly breed serious competition among teammates. Finally, the best solution would be offering team sports as an optional project for students. In conclusion, boosting children association by teamsports may not be feasible for all of them, but operating more joint projects for those with passion and fair play is a much better approach.""",
        "examiner_comment": "",
    },
    {
        "band": 8.0,
        "task_type": 2,
        "verified": True,
        "essay": """Public health has become an increasingly pressing issue in the modern world, with many populations facing rising rates of obesity, diabetes, and other diet-related diseases. This has led to a debate as to whether governments should establish nutrition and food choice laws for the betterment of public health or if it solely falls on individuals to make wise choices. In my view, everyone should take ownership of their diet and assume responsibility for their health because it is the right choice. The argument for government-imposed nutrition and food choice laws is that they could help prevent people from making unhealthy choices which could lead to more serious illnesses down the line. However, there are also some valid arguments against governmental intervention. These types of regulations infringe upon individuals right to choose what they put in their bodies. In conclusion, while there can certainly be benefits associated with implementing nutrition and food choice laws at a governmental level, ultimately it should still come down to personal choice and responsibility.""",
        "examiner_comment": "The writer presented ideas and examples that are relevant and directly related to the topic. All parts of the question have been addressed and the arguments sufficiently supported. This essay has plenty of uncommon lexical items which have been used appropriately. There is a variety of complex sentence structures, the writer has good control of punctuation, and the majority of their sentences are error-free. This essay is likely to get Band 8-8.5 in IELTS.",
    },
    {
        "band": 8.5,
        "task_type": 2,
        "verified": False,
        "essay": """There is currently a material issue that while the majority of students are eager to learn business or art in university, there are only a few students who want to study science, leading to numerous negative effects on community. It is undeniable that there are many reasons why undergraduates avoid studying science. A classic example of this is that science is extremely difficult to understand. Another common reason is a small amount of salary for working in scientific fields. It is true that there are many negative consequences on society of having less undergraduates studying science. One clear impact of this is the decreasing in innovation. In conclusion, it is the fact that science is complicated and people who have scientific knowledge can make less money than those who are expertise in other areas, resulting in less popularity in learning about science for university students.""",
        "examiner_comment": "",
    },
]


def build_few_shot_context(task_type: int) -> str:
    examples = [e for e in FEW_SHOT_EXAMPLES if e["task_type"] == task_type]

    if not examples:
        examples = FEW_SHOT_EXAMPLES

    context = "\nCALIBRATION EXAMPLES — Real IELTS scored essays:\n"
    for ex in examples:
        quality_tag = "Examiner Verified" if ex["verified"] else "Band Score Reference"
        context += f"\n--- Band {ex['band']} Example ({quality_tag}) ---\n"
        context += f"Essay excerpt: {ex['essay'][:500]}...\n"
        if ex["examiner_comment"]:
            context += f"Examiner verdict: {ex['examiner_comment']}\n"

    return context