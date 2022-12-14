import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import Avatar from './Avatar'
import { LinkIcon, PhotographIcon } from '@heroicons/react/outline'
import { useForm } from 'react-hook-form'
import { useMutation } from '@apollo/client'
import { ADD_POST, ADD_SUBREDDIT } from '../graphql/mutations'
import { GET_SUBREDDIT_BY_TOPIC } from '../graphql/queries'
import toast from 'react-hot-toast'
import client from '../apollo-client'


type FormData = {
    postTitle: string
    postBody: string
    postImage: string
    subreddit: string
}

function PostBox() {
    const { data: session } = useSession()
    const [addPost] = useMutation(ADD_POST)
    const [addSubreddit] = useMutation(ADD_SUBREDDIT)
    
    const [imageBoxOpen, setImageBoxOpen] = useState<boolean>(false)
    const {
        register,
        setValue,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FormData>()

    const onSubmit = handleSubmit(async (formData) => {
        console.log(formData);
        const notification = toast.loading('Creating new post...')

        try {
            // query for thread topics
            const {
                data: { getSubredditListByTopic },
            } = await client.query({
                query: GET_SUBREDDIT_BY_TOPIC,
                variables: {
                    topic: formData.subreddit,
                },
            })

            const subredditExists = getSubredditListByTopic.length > 0

            if (!subredditExists) {
                // create subreddit
                console.log('Subreddit is new, creating new subreddit')
                
                const {
                    data: { insertSubreddit: newSubreddit },
                } = await addSubreddit({
                    variables: {
                        topic: formData.subreddit,
                    },
                })

                console.log('Creating post...', formData)
                const image = formData.postImage || ''

                const {
                    data: { insertPost: newPost },
                } = await addPost({
                    variables: {
                        body: formData.postBody,
                        image: image,
                        subreddit_id: newSubreddit.id,
                        title: formData.postTitle,
                        username: session?.user?.name,
                    },
                })

                console.log('New post added', newPost)
            } else {
                // use existing subreddit
                console.log('Using existing subreddit')
                console.log(getSubredditListByTopic)

                const image = formData.postImage || ''

                const {
                    data: { insertPost: newPost },
                } = await addPost({
                    variables: {
                        body: formData.postBody,
                        image: image,
                        subreddit_id: getSubredditListByTopic[0].id,
                        title: formData.postTitle,
                        username: session?.user?.name,
                    },
                })
                
                console.log('New post added', newPost)
            }

            // after post has been added
            setValue('postBody', '')
            setValue('postImage', '')
            setValue('postTitle', '')
            setValue('subreddit', '')
            
            toast.success('New post created', {
                id: notification, 
            })
        } catch (error) {
            toast.error('Whoops something went wrong!', {
                id: notification,
            })
        }
    })
  
    return (
        <form 
            onSubmit={onSubmit} 
            className="sticky top-16 z-50 bg-white rounded-md border border-rounded border-gray-300 p-2"
        >
            <div className="flex items-center space-x-3">
                {/* Avatar */}
                <Avatar />

                <input 
                    {...register('postTitle', { required:true })}
                    disabled={!session}
                    className="flex-1 rounded-md bg-gray-50 p-2 pl-5 outline-none"
                    type="text" 
                    placeholder={session ? 'Enter a title for your post' : 'Sign in to post' } />

                    <PhotographIcon onClick={() => setImageBoxOpen(!imageBoxOpen)}
                    className={`h-6 cursor-pointer text-gray-300 ${imageBoxOpen && 'text-blue-300'
                    }`} 
                />
                <LinkIcon className="h-6 text-gray-300" />
            </div>

            {!!watch('postTitle') && (
                <div className="flex flex-col py-2">
                    {/*  Body */}
                    <div className="flex items-center px-2">
                        <p className="min-w-[90px]">Body:</p>
                        <input className="m-2 flex-1 bg-green-50 p-2 outline-none"
                        {...register('postBody')}
                        type="text" placeholder="Text (optional)" />
                    </div>

                    <div className="flex items-center px-2">
                        <p className="min-w-[90px]">Sub-Thread:</p>
                        <input className="m-2 flex-1 bg-green-50 p-2 outline-none"
                        {...register('subreddit', { required: true })}
                        type="text" placeholder="i.e. next.js" />
                    </div>

                    {imageBoxOpen && (
                        <div className="flex items-center px-2">
                            <p className="min-w-[90px]">Image URL:</p>
                            <input className="m-2 flex-1 bg-green-50 p-2 outline-none"
                            {...register('postImage')}
                            type="text" placeholder="optional" />
                        </div>
                    )}

                    {/* error handling & submmission */}
                    {Object.keys(errors).length > 0 && (
                        <div className="space-y-2 p-2 text-red-500">
                            {errors.postTitle?.type === 'required' && (
                                <p>- A Post Title is required</p>
                            )}

                            {errors.subreddit?.type === 'required' && (
                                <p>- A subreddit is required</p>
                            )}
                        </div>
                    )}

                    {!!watch('postTitle') && (
                        <button type="submit" className="w-[50%] mx-auto rounded-full bg-blue-400 text-white p-2">create post</button>
                    )}
                </div>
            )}
        </form>
    )
}

export default PostBox